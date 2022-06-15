import { APIGatewayProxyResultV2, SQSEvent } from "aws-lambda";
import { saveRecord } from "../services/dynamodb-service";

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
    speakerName: string,
    callId: string
}

/**
 * Handles event from SQS queue
 * @param event {SQSEvent} SQS payload
 * @returns {Promise<APIGatewayProxyResultV2>} handler result
 */
export async function event(event: SQSEvent): Promise<APIGatewayProxyResultV2> {
    const messages = event.Records.map((record) => {
        const body = JSON.parse(record.body) as TranscribeMessageEvent;
        return body;
    });
    const saveRecords = messages.map((message: TranscribeMessageEvent) => {
        const callId = message.callId;
        const endTime = message.Results[0].EndTime;
        const items = message.Results[0].Alternatives[0].Items;
        const resultId = message.Results[0].ResultId;
        const speakerName = message.speakerName;
        const startTime = message.Results[0].StartTime;
        const transcript = message.Results[0].Alternatives[0].Transcript;
        const record =  { callId, endTime, items, resultId, speakerName, startTime, transcript };
        return saveRecord(record, process.env.DYNAMODB_TRANSCRIPTS_TABLENAME || "");
    });
    await saveRecords;
    return {
        statusCode: 200
    };
}
