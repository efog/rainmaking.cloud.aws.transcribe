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
const debug = (0, debug_1.default)("DEBUG::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const trace = (0, debug_1.default)("TRACE::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const info = (0, debug_1.default)("INFO::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const warn = (0, debug_1.default)("WARN::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const error = (0, debug_1.default)("ERROR::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const eventStreamMarshaller = new marshaller.EventStreamMarshaller(utilUtf8Node.toUtf8, utilUtf8Node.fromUtf8);
/**
 * Transcribe streaming service helper class.
 */
class TranscribeStreamingJobService {
    /**
     * Creates a presigned URL for Amazon Transcribe service using settings.
     * @returns {string} parameterized pre-signed URL.
     */
    static createPresignedURL(settings) {
        const endpoint = "transcribestreaming." + (settings === null || settings === void 0 ? void 0 : settings.region) + ".amazonaws.com:8443";
        // get a preauthenticated URL that we can use to establish our WebSocket
        return v4.createPresignedURL("GET", endpoint, "/stream-transcription-websocket", "transcribe", (0, crypto_1.createHash)("sha256").update("", "utf8").digest("hex"), {
            key: settings === null || settings === void 0 ? void 0 : settings.awsAccessKeyId,
            secret: settings === null || settings === void 0 ? void 0 : settings.awsSecretAccessKey,
            sessionToken: settings === null || settings === void 0 ? void 0 : settings.awsSessionToken,
            protocol: "wss",
            expires: 15,
            region: settings === null || settings === void 0 ? void 0 : settings.region,
            query: "partial-results-stability=medium&enable-partial-results-stabilization=true" + "&language-code=" + (settings === null || settings === void 0 ? void 0 : settings.languageCode) + "&media-encoding=pcm&sample-rate=" + (settings === null || settings === void 0 ? void 0 : settings.sampleRate)
        });
    }
    /**
     * Transcribes audio stream
     */
    static transcribeStream(settings) {
        const url = TranscribeStreamingJobService.createPresignedURL(settings);
        const transcribeSocket = new ws_1.WebSocket(url);
        transcribeSocket.binaryType = "arraybuffer";
        transcribeSocket.onopen = () => {
            settings.inputWebSocket.onmessage = (audioEvent) => {
                const data = audioEvent.data;
                transcribeSocket === null || transcribeSocket === void 0 ? void 0 : transcribeSocket.send(data);
            };
        };
        transcribeSocket.onmessage = (ev) => {
            const data = Buffer.from(ev.data);
            const messageWrapper = eventStreamMarshaller.unmarshall(data);
            const body = Array.from(messageWrapper.body);
            const messageBody = JSON.parse(String.fromCharCode.apply(String, body));
            if (messageWrapper.headers[":message-type"].value === "event") {
                trace(JSON.stringify(messageBody));
            }
            else {
                trace("received error from Amazon Transcribe");
                trace(JSON.stringify(messageBody));
            }
        };
    }
}
exports.TranscribeStreamingJobService = TranscribeStreamingJobService;
