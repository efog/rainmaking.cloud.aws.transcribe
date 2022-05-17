import { StartStreamTranscriptionCommand, TranscribeStreamingClient } from "@aws-sdk/client-transcribe-streaming";
import Debug from "debug";
import { Readable } from "stream";

const debug = Debug("DEBUG::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const trace = Debug("TRACE::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const info = Debug("INFO::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const warn = Debug("WARN::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const error = Debug("ERROR::SERVER::SERVICES::transcribe-streaming-job-service.ts");

export interface TranscribeStreamingJobServiceOptions {
    path: URL | undefined;
    transcribeClient: TranscribeStreamingClient | undefined;
    readableStream: Readable | undefined;
}

export class TranscribeStreamingJobService {
    private options: TranscribeStreamingJobServiceOptions | undefined;
    private client: TranscribeStreamingClient;
    constructor(options: TranscribeStreamingJobServiceOptions | undefined) {
        this.options = options;
        this.client = this.options?.transcribeClient || new TranscribeStreamingClient({
            region: process.env.AWS_DEFAULT_REGION || "us-east-1"
        });
    }

    /**
     * Transcribes audio stream
     */
    async transcribeStream() {
        const options = this.options;
        async function* getAsyncIterator() {
            trace("reading chunk");
            const chunk = options?.readableStream?.read();
            yield { AudioEvent: { AudioChunk: chunk } };
        }
        const stream = getAsyncIterator;
        const command = new StartStreamTranscriptionCommand({
            AudioStream: stream(),
            MediaSampleRateHertz: 16000,
            MediaEncoding: "pcm",
            LanguageCode: "en-US"
        });
        const output = await (this.client as TranscribeStreamingClient).send(command);
        trace(`transcribe output ${JSON.stringify(output.RequestId)}`);
    }
}
