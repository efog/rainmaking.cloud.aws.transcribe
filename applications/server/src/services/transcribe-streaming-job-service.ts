import { createHash } from "crypto";
import Debug from "debug";
import { MessageEvent, WebSocket } from "ws";
import * as marshaller from "@aws-sdk/eventstream-marshaller";
import * as utilUtf8Node from "@aws-sdk/util-utf8-node";
import * as v4 from "./crypto-service";

const debug = Debug("DEBUG::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const trace = Debug("TRACE::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const info = Debug("INFO::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const warn = Debug("WARN::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const error = Debug("ERROR::SERVER::SERVICES::transcribe-streaming-job-service.ts");

const eventStreamMarshaller = new marshaller.EventStreamMarshaller(utilUtf8Node.toUtf8, utilUtf8Node.fromUtf8);

/**
 * Transcribe streaming service helper instantiation settings
 */
export interface TranscribeStreamingJobServiceSettings {
    /**
     * AWS Access Key identifier
     */
    awsAccessKeyId: string;
    /**
     * AWS Secret Key
     */
    awsSecretAccessKey: string;
    /**
     * AWS Authenticated Session token
     */
    awsSessionToken: string;
    /**
     * Input stream websocket
     */
    inputWebSocket: WebSocket;
    /**
     * Amazon Transcribe Streaming session language code
     */
    languageCode: string;
    /**
     * AWS Region to use
     */
    region: string;
    /**
     * Audio stream sample rate
     */
    sampleRate: string;
}

/**
 * Transcribe streaming service helper class.
 */
export class TranscribeStreamingJobService {

    /**
     * Creates a presigned URL for Amazon Transcribe service using settings.
     * @returns {string} parameterized pre-signed URL.
     */
    private static createPresignedURL(settings: TranscribeStreamingJobServiceSettings) {
        const endpoint = "transcribestreaming." + settings?.region + ".amazonaws.com:8443";
        // get a preauthenticated URL that we can use to establish our WebSocket
        return v4.createPresignedURL(
            "GET",
            endpoint,
            "/stream-transcription-websocket",
            "transcribe",
            createHash("sha256").update("", "utf8").digest("hex"), {
                key: settings?.awsAccessKeyId,
                secret: settings?.awsSecretAccessKey,
                sessionToken: settings?.awsSessionToken,
                protocol: "wss",
                expires: 15,
                region: settings?.region,
                query: "partial-results-stability=medium&enable-partial-results-stabilization=true" + "&language-code=" + settings?.languageCode + "&media-encoding=pcm&sample-rate=" + settings?.sampleRate
            }
        );
    }

    /**
     * Transcribes audio stream
     */
    public static transcribeStream(settings: TranscribeStreamingJobServiceSettings) {
        const url = TranscribeStreamingJobService.createPresignedURL(settings);
        const transcribeSocket = new WebSocket(url);
        transcribeSocket.binaryType = "arraybuffer";
        transcribeSocket.onopen = () => {
            settings.inputWebSocket.onmessage = (audioEvent: MessageEvent) => {
                const data = audioEvent.data as Buffer;
                transcribeSocket?.send(data);
            };
        };
        transcribeSocket.onmessage = (ev: MessageEvent) => {
            const data = Buffer.from(ev.data as any);
            const messageWrapper = eventStreamMarshaller.unmarshall(data);
            const body = Array.from(messageWrapper.body);
            const messageBody = JSON.parse(String.fromCharCode.apply(String, body));
            if (messageWrapper.headers[":message-type"].value === "event") {
                trace(JSON.stringify(messageBody));
            } else {
                trace("received error from Amazon Transcribe");
                trace(JSON.stringify(messageBody));
            }
        };
    }
}
