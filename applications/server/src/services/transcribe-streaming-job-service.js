"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscribeStreamingJobService = void 0;
const crypto_1 = require("crypto");
const debug_1 = __importDefault(require("debug"));
const ws_1 = require("ws");
const marshaller = __importStar(require("@aws-sdk/eventstream-marshaller"));
const utilUtf8Node = __importStar(require("@aws-sdk/util-utf8-node"));
const v4 = __importStar(require("./crypto-service"));
const audio_utils_1 = require("./audio-utils");
const debug = (0, debug_1.default)("DEBUG::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const trace = (0, debug_1.default)("TRACE::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const info = (0, debug_1.default)("INFO::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const warn = (0, debug_1.default)("WARN::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const error = (0, debug_1.default)("ERROR::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const eventStreamMarshaller = new marshaller.EventStreamMarshaller(utilUtf8Node.toUtf8, utilUtf8Node.fromUtf8);
class TranscribeStreamingJobService {
    // private client: TranscribeStreamingClient;
    constructor(options) {
        this.options = options;
        // this.client = this.options?.transcribeClient || new TranscribeStreamingClient({
        //     region: this.options.region || "us-east-1"
        // });
    }
    createPresignedURL() {
        var _a, _b, _c, _d, _e, _f, _g;
        const endpoint = "transcribestreaming." + ((_a = this.options) === null || _a === void 0 ? void 0 : _a.region) + ".amazonaws.com:8443";
        // get a preauthenticated URL that we can use to establish our WebSocket
        return v4.createPresignedURL("GET", endpoint, "/stream-transcription-websocket", "transcribe", (0, crypto_1.createHash)("sha256").update("", "utf8").digest("hex"), {
            key: (_b = this.options) === null || _b === void 0 ? void 0 : _b.awsAccessKeyId,
            secret: (_c = this.options) === null || _c === void 0 ? void 0 : _c.awsSecretAccessKey,
            sessionToken: (_d = this.options) === null || _d === void 0 ? void 0 : _d.awsSessionToken,
            protocol: "wss",
            expires: 15,
            region: (_e = this.options) === null || _e === void 0 ? void 0 : _e.region,
            query: "language-code=" + ((_f = this.options) === null || _f === void 0 ? void 0 : _f.languageCode) + "&media-encoding=pcm&sample-rate=" + ((_g = this.options) === null || _g === void 0 ? void 0 : _g.sampleRate)
        });
    }
    getAudioEventMessage(buffer) {
        return {
            headers: {
                ":message-type": {
                    type: "string",
                    value: "event"
                },
                ":event-type": {
                    type: "string",
                    value: "AudioEvent"
                }
            },
            body: buffer
        };
    }
    /**
     * Transcribes audio stream
     */
    transcribeStream() {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.createPresignedURL();
            this.transcribeSocket = new ws_1.WebSocket(url);
            this.transcribeSocket.binaryType = "arraybuffer";
            this.transcribeSocket.onopen = () => {
                this.options.inputWebSocket.onmessage = (audioEvent) => {
                    var _a;
                    trace(`audio event type ${JSON.stringify(audioEvent.type)}`);
                    trace(`audio event data ${JSON.stringify(audioEvent.data.slice(0, 10))}`);
                    // eslint-disable-next-line n/no-deprecated-api
                    const data = audioEvent.data;
                    const downsampledBuffer = (0, audio_utils_1.downsampleBuffer)(data, 16000, 16000);
                    // trace(`downsampled data ${JSON.stringify(downsampledBuffer)}`);
                    const pcmEncodedBuffer = (0, audio_utils_1.pcmEncode)(downsampledBuffer);
                    // trace(`pcm encoded buffer ${JSON.stringify(downsampledBuffer)}`);
                    const audioEventMessage = this.getAudioEventMessage(Buffer.from(pcmEncodedBuffer));
                    // trace(`audio event message ${JSON.stringify(audioEventMessage)}`);
                    const binary = eventStreamMarshaller.marshall(audioEventMessage);
                    (_a = this.transcribeSocket) === null || _a === void 0 ? void 0 : _a.send(data);
                };
            };
            this.transcribeSocket.onmessage = (ev) => {
                // eslint-disable-next-line n/no-deprecated-api
                const data = new Buffer(ev.data);
                const messageWrapper = eventStreamMarshaller.unmarshall(data);
                const body = Array.from(messageWrapper.body);
                const messageBody = JSON.parse(String.fromCharCode.apply(String, body));
                if (messageWrapper.headers[":message-type"].value === "event") {
                    trace("received event from Amazon Transcribe");
                    trace(JSON.stringify(messageBody));
                    // handleEventStreamMessage(messageBody);
                }
                else {
                    trace("received error from Amazon Transcribe");
                    trace(JSON.stringify(messageBody));
                    // transcribeException = true;
                    // showError(messageBody.Message);
                    // toggleStartStop();
                }
            };
            // const options = this.options;
            // async function* getAsyncIterator() {
            //     trace("reading chunk");
            //     const chunk = options?.readableStream?.read();
            //     yield { AudioEvent: { AudioChunk: chunk } };
            // }
            // const stream = getAsyncIterator;
            // const command = new StartStreamTranscriptionCommand({
            //     AudioStream: stream(),
            //     MediaSampleRateHertz: 16000,
            //     MediaEncoding: "pcm",
            //     LanguageCode: "en-US"
            // });
            // const output = await (this.client as TranscribeStreamingClient).send(command);
            // trace(`transcribe output ${JSON.stringify(output.RequestId)}`);
        });
    }
}
exports.TranscribeStreamingJobService = TranscribeStreamingJobService;
