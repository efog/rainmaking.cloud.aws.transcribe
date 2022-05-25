"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const debug_1 = __importDefault(require("debug"));
const transcribe_streaming_job_service_1 = require("./services/transcribe-streaming-job-service");
const url_1 = require("url");
const ws_1 = require("ws");
const debug = (0, debug_1.default)("DEBUG::SERVER::index.ts");
const trace = (0, debug_1.default)("TRACE::SERVER::index.ts");
const info = (0, debug_1.default)("INFO::SERVER::index.ts");
const warn = (0, debug_1.default)("WARN::SERVER::index.ts");
const error = (0, debug_1.default)("ERROR::SERVER::index.ts");
trace(`starting server on port ${process.env.PORT}`);
const server = (0, http_1.createServer)();
const wss = new ws_1.WebSocketServer({
    noServer: true
});
wss.on("connection", (inputWebSocket, request, client) => {
    trace(`connection from client ${JSON.stringify(client)}`);
    const path = new url_1.URL(request.url, "http://localhost");
    const transcribeClient = undefined;
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsSessionToken = process.env.AWS_SESSION_TOKEN;
    const languageCode = "en-US";
    const region = process.env.AWS_DEFAULT_REGION;
    const sampleRate = "44100";
    const options = { awsAccessKeyId, awsSecretAccessKey, awsSessionToken, inputWebSocket, languageCode, path, region, sampleRate, transcribeClient };
    inputWebSocket.on("close", (ev) => {
        trace(`connection closed for ${path}`);
    });
    trace(`connection opened for path ${path}`);
    const transcribeStreamingJobService = new transcribe_streaming_job_service_1.TranscribeStreamingJobService(options);
    transcribeStreamingJobService.transcribeStream();
});
server.on("upgrade", (request, socket, head) => {
    trace(`received upgrade request for url ${JSON.stringify(request.url)}`);
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});
trace(`starting listener on port ${process.env.PORT}`);
server.listen(process.env.PORT || "3131");
