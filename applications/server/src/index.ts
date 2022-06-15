import { createServer } from "http";
import { DateTime } from "luxon";
import Debug from "debug";
import { ErrorMessageEvent, TranscribeMessageEvent, TranscribeStreamingJobService, TranscribeStreamingJobServiceSettings } from "./services/transcribe-streaming-job-service";
import { URL } from "url";
import { WebSocket, WebSocketServer } from "ws";
import express, { Request, Response } from "express";
import { IamService } from "./services/iam-service";
import { SQSService } from "./services/sqs-service";

const app = express();
const debug = Debug("DEBUG::SERVER::index.ts");
const trace = Debug("TRACE::SERVER::index.ts");
const info = Debug("INFO::SERVER::index.ts");
const warn = Debug("WARN::SERVER::index.ts");
const error = Debug("ERROR::SERVER::index.ts");

trace(`starting server on port ${process.env.PORT}`);

const server = createServer();
const wss = new WebSocketServer({
    noServer: true
});

server.on("request", app.get("/api/stt/healthcheck", (request: Request, response: Response) => {
    response.statusCode = 200;
    response.send("Yes, I'm ok");
}));

wss.on("connection", async (inputWebSocket: WebSocket, request: any, client: any) => {

    trace(`connection from client ${JSON.stringify(client)}`);
    const path = new URL(request.url, "http://localhost");
    let awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    let awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let awsSessionToken = process.env.AWS_SESSION_TOKEN;
    if (process.env.TRANSCRIBESTREAM_CLIENT_ROLEARN) {
        const assumeRoleResult = await IamService.assumeTranscribeStreamClientRole(process.env.TRANSCRIBESTREAM_CLIENT_ROLEARN);
        awsAccessKeyId = assumeRoleResult.Credentials?.AccessKeyId;
        awsSecretAccessKey = assumeRoleResult.Credentials?.SecretAccessKey;
        awsSessionToken = assumeRoleResult.Credentials?.SessionToken;
    }
    const languageCode = path.searchParams.get("language") || "en-US";
    const region = path.searchParams.get("region") || process.env.AWS_DEFAULT_REGION;
    const sampleRate = path.searchParams.get("sampleRate") || "44100";
    const speakerName = path.searchParams.get("speakerName") || null;
    const callId = path.searchParams.get("callId") || null;
    const settings = { awsAccessKeyId, awsSecretAccessKey, awsSessionToken, inputWebSocket, languageCode, region, sampleRate, speakerName } as TranscribeStreamingJobServiceSettings;

    trace(`connection opened for path ${path}`);
    try {
        const service = TranscribeStreamingJobService.transcribeStream(settings);
        const sqsService = new SQSService();
        const queueUrl = process.env.SQS_OUTPUT_QUEUE_URL || "";
        inputWebSocket.on("close", (ev: Event) => {
            trace(`connection closed for ${path}`);
        });
        service.onerror((err: ErrorMessageEvent) => {
            error(JSON.stringify(err));
        });
        service.onmessage(async (evt: TranscribeMessageEvent) => {
            trace(`${JSON.stringify(evt)}`);
            const timestamp = DateTime.utc().toISO();
            if (evt.Transcript.Results.length > 0 && !evt.Transcript.Results[0].IsPartial) {
                const payload = Object.assign(evt.Transcript, { speakerName, callId, timestamp });
                await sqsService.sendMessage(payload, queueUrl);
            }
        });
    } catch (err: any) {
        error(err);
        inputWebSocket.close();
    }
});
server.on("upgrade", (request, socket, head): void => {
    trace(`received upgrade request for url ${JSON.stringify(request.url)}`);
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});

trace(`starting listener on port ${process.env.PORT}`);
server.listen(process.env.PORT || "3131");
