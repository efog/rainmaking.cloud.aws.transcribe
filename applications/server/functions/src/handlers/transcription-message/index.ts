import { APIGatewayProxyResultV2, SQSEvent } from "aws-lambda";
import { DateTime } from "luxon";
import Debug from "debug";
import { saveRecord } from "../services/dynamodb-service";

const debug = Debug("DEBUG::FUNCTIONS::TRANSCRIPTION_MESSAGE::index.ts");
const trace = Debug("TRACE::FUNCTIONS::TRANSCRIPTION_MESSAGE::index.ts");
const info = Debug("INFO::FUNCTIONS::TRANSCRIPTION_MESSAGE::index.ts");
const warn = Debug("WARN::FUNCTIONS::TRANSCRIPTION_MESSAGE::index.ts");
const error = Debug("ERROR::FUNCTIONS::TRANSCRIPTION_MESSAGE::index.ts");

/**
 * Transcribe result event message structure
 */
export type TranscribeMessageEvent = {
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
    }],
    callId: string,
    speakerName: string,
    timestamp: string,
}

/**
 * Handles event from SQS queue
 * @param event {SQSEvent} SQS payload
 * @returns {Promise<APIGatewayProxyResultV2>} handler result
 */
export async function event(event: SQSEvent): Promise<APIGatewayProxyResultV2> {
    trace(`received event ${JSON.stringify(event)}`);
    const messages = event.Records.map((record) => {
        const body = JSON.parse(record.body) as TranscribeMessageEvent;
        return body;
    });
    const saveRecords = messages.map((message: TranscribeMessageEvent) => {
        trace(`processing message ${JSON.stringify(message)}`);
        const callId = message.callId;
        const endTime = message.Results[0].EndTime;
        const items = message.Results[0].Alternatives[0].Items;
        const resultId = message.Results[0].ResultId;
        const speakerName = message.speakerName;
        const startTime = message.Results[0].StartTime;
        const timestamp = message.timestamp;
        const transcript = message.Results[0].Alternatives[0].Transcript;
        const record = { callId, endTime, items, resultId, speakerName, startTime, transcript, timestamp };
        trace(`saving ${JSON.stringify(record)}`);
        return saveRecord(record, process.env.DYNAMODB_TRANSCRIPTS_TABLENAME || "");
    });
    try {
        trace("awaiting all promises completion");
        await Promise.all(saveRecords);
        return {
            statusCode: 200
        };
    }
    catch (err: any) {
        error(`save record produced an error: ${JSON.stringify(err)}`);
        return {
            statusCode: 500,
            body: err
        };
    }
}
