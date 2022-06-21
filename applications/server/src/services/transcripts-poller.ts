import Debug from "debug";
import { DateTime, Duration } from "luxon";
import { EventEmitter } from "stream";
import { Transcript } from "./transcript-type";
import { readTranscriptsTable } from "./transcripts-table-client";

const debug = Debug("DEBUG::SERVER::SERVICES::transcripts-poller");
const trace = Debug("TRACE::SERVER::SERVICES::transcripts-poller");
const info = Debug("INFO::SERVER::SERVICES::transcripts-poller");
const warn = Debug("WARN::SERVER::SERVICES::transcripts-poller");
const error = Debug("ERROR::SERVER::SERVICES::transcripts-poller");

export type TranscriptPollEvent = {
    transcripts: Transcript[]
}
export class TranscriptsPoller {
    emitter: EventEmitter;
    interval: number;
    callId: string;
    // eslint-disable-next-line no-undef
    timer: NodeJS.Timer;

    /**
     * Default constructor
     */
    constructor(callId: string, interval: number) {
        this.callId = callId;
        this.emitter = new EventEmitter();
        this.interval = interval;
        this.timer = setInterval(async () => { await this.getTranscripts(this.callId); }, interval * 1000);
    }
    async getTranscripts(callId: string) {
        try {
            const since = DateTime.utc().minus({ seconds: this.interval });
            const results = await readTranscriptsTable(callId, since);
            this.emitter.emit("poll", results);
        } catch (err: any) {
            error(err);
        }
    }
    onpoll(listener: (evt: TranscriptPollEvent) => void) {
        this.emitter.addListener("poll", listener); ;
    }
    stop() {
        this.timer && clearInterval(this.timer);
    }
    static getPollerForCall(callId: string, interval: number): TranscriptsPoller {
        return new TranscriptsPoller(callId, interval);
    }
}
