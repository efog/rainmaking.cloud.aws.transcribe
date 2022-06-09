import { createServer } from "http";
import Debug from "debug";
import { TranscribeStreamingJobService, TranscribeStreamingJobServiceSettings } from "./services/transcribe-streaming-job-service";
import { URL } from "url";
import { WebSocket, WebSocketServer } from "ws";
import express, { Request, Response } from "express";

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

wss.on("connection", (inputWebSocket: WebSocket, request: any, client: any) => {
    trace(`connection from client ${JSON.stringify(client)}`);
    const path = new URL(request.url, "http://localhost");
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsSessionToken = process.env.AWS_SESSION_TOKEN;
    const languageCode = path.searchParams.get("language") || "en-US";
    const region = path.searchParams.get("region") || process.env.AWS_DEFAULT_REGION;
    const sampleRate = path.searchParams.get("sampleRate") || "44100";
    const settings = { awsAccessKeyId, awsSecretAccessKey, awsSessionToken, inputWebSocket, languageCode, region, sampleRate } as TranscribeStreamingJobServiceSettings;
    trace(`connection opened for path ${path}`);
    try {
        TranscribeStreamingJobService.transcribeStream(settings);
        inputWebSocket.on("close", (ev: Event) => {
            trace(`connection closed for ${path}`);
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
