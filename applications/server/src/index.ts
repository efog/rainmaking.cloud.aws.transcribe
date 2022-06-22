import { createServer, IncomingMessage } from "http";
import { DateTime } from "luxon";
import Debug from "debug";
import { ErrorMessageEvent, TranscribeMessageEvent, TranscribeStreamingJobService, TranscribeStreamingJobServiceSettings } from "./services/transcribe-streaming-job-service";
import { URL } from "url";
import { WebSocket, WebSocketServer } from "ws";
import express, { Request, Response } from "express";
import { IamService } from "./services/iam-service";
import { SQSService } from "./services/sqs-service";
import { Duplex } from "stream";
import { v4 as uuidv4 } from "uuid";
import { TranscriptPollEvent, TranscriptsPoller } from "./services/transcripts-poller";

const app = express();
const debug = Debug("DEBUG::SERVER::index.ts");
const trace = Debug("TRACE::SERVER::index.ts");
const info = Debug("INFO::SERVER::index.ts");
const warn = Debug("WARN::SERVER::index.ts");
const error = Debug("ERROR::SERVER::index.ts");

trace(`starting server on port ${process.env.PORT}`);

const server = createServer();
const wssForAudio = new WebSocketServer({
    noServer: true
});
const wssForMonitor = new WebSocketServer({
    noServer: true
});

server.on("request", app.get("/api/stt/healthcheck", (request: Request, response: Response) => {
    response.statusCode = 200;
    response.send("Yes, I'm ok");
}));

wssForAudio.on("connection", async (inputWebSocket: WebSocket, request: any, client: any) => {
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
    const speakerName = path.searchParams.get("username") || "somebody";
    const callId = path.searchParams.get("callId") || "abcde1234";
    const settings = { awsAccessKeyId, awsSecretAccessKey, awsSessionToken, inputWebSocket, languageCode, region, sampleRate, speakerName } as TranscribeStreamingJobServiceSettings;

    const connectionTimeout = setTimeout(() => {
        clearTimeout(connectionTimeout);
        inputWebSocket.close();
    }, 30 * 1000);

    trace(`connection opened for path ${path}`);
    try {
        const service = TranscribeStreamingJobService.transcribeStream(settings);
        const sqsService = new SQSService();
        const queueUrl = process.env.SQS_OUTPUT_QUEUE_URL || "";
        inputWebSocket.on("close", (ev: Event) => {
            trace(`connection closed for ${path}`);
            if (connectionTimeout.hasRef()) {
                clearTimeout(connectionTimeout);
            }
        });
        service.onerror((err: ErrorMessageEvent) => {
            error(JSON.stringify(err));
        });
        service.onmessage(async (evt: TranscribeMessageEvent) => {
            trace(`${JSON.stringify(evt)}`);
            const eventTimestamp = DateTime.utc().toISO();
            if (evt.Transcript.Results.length > 0 && !evt.Transcript.Results[0].IsPartial) {
                const payload = Object.assign(evt.Transcript, { speakerName, callId, eventTimestamp });
                await sqsService.sendMessage(payload, queueUrl);
            }
        });
    } catch (err: any) {
        error(err);
        inputWebSocket.close();
    }
});

const listeners: { [key: string]: WebSocket } = {};
wssForMonitor.on("connection", async (inputWebSocket: WebSocket, request: any, client: any) => {
    trace(`received connection request for url ${JSON.stringify(request.url)}`);
    const path = new URL(request.url, "http://localhost");
    const callId = path.searchParams.get("callId") || "abcde1234";
    const callerId = uuidv4();
    const poller = TranscriptsPoller.getPollerForCall(callId, 10);
    inputWebSocket.on("close", (evt: CloseEvent) => {
        delete listeners[callerId];
        poller.stop();
    });
    inputWebSocket.send(JSON.stringify(
        {
            type: "callerId",
            value: callerId
        }
    ));
    inputWebSocket.send(JSON.stringify(
        {
            type: "callId",
            value: callId
        }
    ));
    poller.onpoll((evt: TranscriptPollEvent) => {
        inputWebSocket.send(
            JSON.stringify({
                type: "transcripts",
                value: evt
            })
        );
    });
});

server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const path = new URL(request?.url || "", "http://localhost");
    const callId = path.searchParams.get("callId") || "abcde1234";
    trace(`upgrade requested for url ${JSON.stringify(request.url)}`);
    trace(`upgrade requested for path ${path.pathname}`);
    if (path.pathname === "/api/stt/transcribe") {
        wssForAudio.handleUpgrade(request, socket, head, (ws) => {
            wssForAudio.emit("connection", ws, request);
        });
    } else if (path.pathname === "/api/stt/connect") {
        wssForMonitor.handleUpgrade(request, socket, head, (ws) => {
            wssForMonitor.emit("connection", ws, request);
        });
    } else {
        socket.destroy();
    }
});

trace(`starting listener on port ${process.env.PORT}`);
server.listen(process.env.PORT || "3131");
