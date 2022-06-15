import { createHash } from "crypto";
import Debug from "debug";
import { MessageEvent, WebSocket } from "ws";
import * as marshaller from "@aws-sdk/eventstream-marshaller";
import * as utilUtf8Node from "@aws-sdk/util-utf8-node";
import * as v4 from "./crypto-service";
import { EventEmitter } from "stream";

const debug = Debug("DEBUG::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const trace = Debug("TRACE::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const info = Debug("INFO::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const warn = Debug("WARN::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const error = Debug("ERROR::SERVER::SERVICES::transcribe-streaming-job-service.ts");

const eventStreamMarshaller = new marshaller.EventStreamMarshaller(utilUtf8Node.toUtf8, utilUtf8Node.fromUtf8);

/**
 * Error message from Transcribe structure
 */
export type ErrorMessageEvent = {
    Message: string
}

/**
 * Transcribe content item types
 */
export type ContentType = {
    pronunciation: "pronuntiation",
    punctuation: "punctuation"
}

/**
 * Transcribe result event message structure
 */
export type TranscribeMessageEvent = {
    Transcript: {
        Results: [{
            Alternatives: [{
                Items: [{
                    Content: string,
                    EndTime: number,
                    Stable: boolean,
                    StartTime: number,
                    Type: string,
                    VocabularyFilterMatch: false
                }],
                Transcript: string
            }],
            EndTime: number,
            IsPartial: boolean,
            ResultId: string,
            StartTime: number
        }]
    }
}

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
    /**
     * Speaker's name
     */
    speakerName: string;
}

/**
 * Transcribe streaming service helper class.
 */
export class TranscribeStreamingJobService {

    private transcribeSocket: WebSocket;
    private emitter: EventEmitter;

    /**
     * Default constructor
     * @param transcribeSocket transcribe socket
     */
    private constructor(transcribeSocket: WebSocket, audioSocket: WebSocket) {
        this.emitter = new EventEmitter();
        this.transcribeSocket = transcribeSocket;
        transcribeSocket.onopen = () => {
            audioSocket.onmessage = (evt: MessageEvent) => { this.handleAudioMessage(evt); };
        };
        transcribeSocket.onmessage = (evt: MessageEvent) => { this.handleTranscribeMessage(evt); };
    }

    onmessage(listener: (evt: TranscribeMessageEvent) => void) {
        this.emitter.addListener("message", listener); ;
    }

    onerror(listener: (evt: ErrorMessageEvent) => void) {
        this.emitter.addListener("error", listener); ;
    }

    /**
     * Handles audio message
     * @param audioEvent Message event from audio input socket
     */
    private handleAudioMessage(audioEvent: MessageEvent) {
        const data = audioEvent.data as Buffer;
        this.transcribeSocket?.send(data);
    }

    /**
     * Handles message from transcribe websocket
     * @param ev Message event from websocket
     */
    private handleTranscribeMessage(ev: MessageEvent) {
        const data = Buffer.from(ev.data as any);
        const messageWrapper = eventStreamMarshaller.unmarshall(data);
        const body = Array.from(messageWrapper.body);
        const messageBody = JSON.parse(String.fromCharCode.apply(String, body));
        if (messageWrapper.headers[":message-type"].value === "event") {
            trace("received response from transcribe");
            this.emitter.emit("message", messageBody);
        } else {
            trace("received error from Amazon Transcribe");
            this.emitter.emit("error", messageBody);
        }
    }

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
    public static transcribeStream(settings: TranscribeStreamingJobServiceSettings): TranscribeStreamingJobService {
        const url = TranscribeStreamingJobService.createPresignedURL(settings);
        const transcribeSocket = new WebSocket(url);
        transcribeSocket.binaryType = "arraybuffer";
        const service = new TranscribeStreamingJobService(transcribeSocket, settings.inputWebSocket);
        return service;
    }
}
