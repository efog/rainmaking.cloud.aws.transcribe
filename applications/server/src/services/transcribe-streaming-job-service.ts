import { TranscribeStreamingClient } from "@aws-sdk/client-transcribe-streaming";
import { createHash } from "crypto";
import Debug from "debug";
import { Readable } from "stream";
import { Data, MessageEvent, WebSocket } from "ws";
import * as marshaller from "@aws-sdk/eventstream-marshaller";
import * as utilUtf8Node from "@aws-sdk/util-utf8-node";
import * as v4 from "./crypto-service";

const debug = Debug("DEBUG::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const trace = Debug("TRACE::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const info = Debug("INFO::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const warn = Debug("WARN::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const error = Debug("ERROR::SERVER::SERVICES::transcribe-streaming-job-service.ts");

const eventStreamMarshaller = new marshaller.EventStreamMarshaller(utilUtf8Node.toUtf8, utilUtf8Node.fromUtf8);

export interface TranscribeStreamingJobServiceOptions {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsSessionToken: string;
    inputWebSocket: WebSocket;
    languageCode: string;
    path: URL | undefined;
    readableStream: Readable | undefined;
    region: string;
    sampleRate: string;
    transcribeClient: TranscribeStreamingClient | undefined;
}

export class TranscribeStreamingJobService {

    private options: TranscribeStreamingJobServiceOptions;
    private transcribeSocket: WebSocket | undefined;
    // private client: TranscribeStreamingClient;

    constructor(options: TranscribeStreamingJobServiceOptions) {
        this.options = options;
        // this.client = this.options?.transcribeClient || new TranscribeStreamingClient({
        //     region: this.options.region || "us-east-1"
        // });
    }

    createPresignedURL() {
        const endpoint = "transcribestreaming." + this.options?.region + ".amazonaws.com:8443";

        // get a preauthenticated URL that we can use to establish our WebSocket
        return v4.createPresignedURL(
            "GET",
            endpoint,
            "/stream-transcription-websocket",
            "transcribe",
            createHash("sha256").update("", "utf8").digest("hex"), {
                key: this.options?.awsAccessKeyId,
                secret: this.options?.awsSecretAccessKey,
                sessionToken: this.options?.awsSessionToken,
                protocol: "wss",
                expires: 15,
                region: this.options?.region,
                query: "language-code=" + this.options?.languageCode + "&media-encoding=pcm&sample-rate=" + this.options?.sampleRate
            }
        );
    }

    getAudioEventMessage(buffer: Buffer): marshaller.Message {
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
    async transcribeStream() {
        const url = this.createPresignedURL();
        this.transcribeSocket = new WebSocket(url);
        this.transcribeSocket.binaryType = "arraybuffer";
        this.transcribeSocket.onopen = () => {
            this.options.inputWebSocket.onmessage = (audioEvent: MessageEvent) => {
                trace(`audio event type ${JSON.stringify(audioEvent.type)}`);
                trace(`audio event data ${JSON.stringify(audioEvent.data.slice(0, 10))}`);
                const data = audioEvent.data as Buffer;
                this.transcribeSocket?.send(data);
            };
        };
        this.transcribeSocket.onmessage = (ev: MessageEvent) => {
            // eslint-disable-next-line n/no-deprecated-api
            const data = new Buffer(ev.data as any);
            const messageWrapper = eventStreamMarshaller.unmarshall(data);
            const body = Array.from(messageWrapper.body);
            const messageBody = JSON.parse(String.fromCharCode.apply(String, body));
            if (messageWrapper.headers[":message-type"].value === "event") {
                trace("received event from Amazon Transcribe");
                trace(JSON.stringify(messageBody));
                // handleEventStreamMessage(messageBody);
            } else {
                trace("received error from Amazon Transcribe");
                trace(JSON.stringify(messageBody));
                // transcribeException = true;
                // showError(messageBody.Message);
                // toggleStartStop();
            }
        };
    }
}
