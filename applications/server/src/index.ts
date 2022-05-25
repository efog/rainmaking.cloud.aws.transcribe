import { createServer } from "http";
import Debug from "debug";
import { TranscribeStreamingJobService, TranscribeStreamingJobServiceOptions } from "./services/transcribe-streaming-job-service";
import { URL } from "url";
import { WebSocket, WebSocketServer, MessageEvent } from "ws";

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

wss.on("connection", (inputWebSocket: WebSocket, request: any, client: any) => {

    trace(`connection from client ${JSON.stringify(client)}`);
    const path = new URL(request.url, "http://localhost");
    const transcribeClient = undefined;
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsSessionToken = process.env.AWS_SESSION_TOKEN;
    const languageCode = path.searchParams.get("language") || "en-US";
    const region = path.searchParams.get("region") || process.env.AWS_DEFAULT_REGION;
    const sampleRate = path.searchParams.get("sampleRate") || "44100";
    const options = { awsAccessKeyId, awsSecretAccessKey, awsSessionToken, inputWebSocket, languageCode, path, region, sampleRate, transcribeClient } as TranscribeStreamingJobServiceOptions;
    inputWebSocket.on("close", (ev: Event) => {
        trace(`connection closed for ${path}`);
    });
    trace(`connection opened for path ${path}`);
    const transcribeStreamingJobService = new TranscribeStreamingJobService(options);
    transcribeStreamingJobService.transcribeStream();
});
server.on("upgrade", (request, socket, head): void => {
    trace(`received upgrade request for url ${JSON.stringify(request.url)}`);
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});
trace(`starting listener on port ${process.env.PORT}`);
server.listen(process.env.PORT || "3131");
