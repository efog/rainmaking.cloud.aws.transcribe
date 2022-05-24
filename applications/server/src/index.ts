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

const pcmEncode = (input: Float32Array) => {
    let offset = 0;
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
};

const downSampleBuffer = (buffer: Float32Array | any[], inputSampleRate = 44100, outputSampleRate = 16000): Float32Array => {
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

wss.on("connection", (inputWebSocket: WebSocket, request: any, client: any) => {

    trace(`connection from client ${JSON.stringify(client)}`);
    const path = new URL(request.url, "http://localhost");
    const transcribeClient = undefined;
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsSessionToken = process.env.AWS_SESSION_TOKEN;
    const languageCode = "en-US";
    const region = process.env.AWS_DEFAULT_REGION;
    const sampleRate = "16000";
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
