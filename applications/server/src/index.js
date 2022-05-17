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
const stream_1 = require("stream");
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
const pcmEncode = (input) => {
    let offset = 0;
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
};
const downSampleBuffer = (buffer, inputSampleRate = 44100, outputSampleRate = 16000) => {
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = accum / count;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
};
wss.on("connection", (ws, request, client) => {
    trace(`connection from client ${JSON.stringify(client)}`);
    const chunks = [];
    const readableStream = new stream_1.Readable({
        read(size) {
            trace("invoked read");
            let retVal;
            if (chunks.length === 0) {
                retVal = new Float32Array(size);
            }
            else {
                retVal = chunks.slice(0, size);
            }
            return retVal;
        }
    });
    const path = new url_1.URL(request.url, "http://localhost");
    const transcribeClient = undefined;
    const transcribeStreamingJobService = new transcribe_streaming_job_service_1.TranscribeStreamingJobService({ path, readableStream, transcribeClient });
    ws.on("message", (data) => {
        trace(`received data for ${path}`);
        chunks.push(data);
    });
    ws.on("close", (ev) => {
        trace(`connection closed for ${path}`);
    });
    trace(`connection opened for path ${path}`);
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
