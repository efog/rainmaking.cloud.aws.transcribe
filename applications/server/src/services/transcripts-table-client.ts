import Debug from "debug";
import { AttributeValue, DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { DateTime, Duration } from "luxon";
import { Transcript } from "./transcript-type";

const debug = Debug("DEBUG::SERVER::SERVICES::transcripts-table-client");
const trace = Debug("TRACE::SERVER::SERVICES::transcripts-table-client");
const info = Debug("INFO::SERVER::SERVICES::transcripts-table-client");
const warn = Debug("WARN::SERVER::SERVICES::transcripts-table-client");
const error = Debug("ERROR::SERVER::SERVICES::transcripts-table-client");

const dynamoDBClient = new DynamoDBClient({
    region: process.env.AWS_DEFAULT_REGION || "ca-central-1"
});

export async function readTranscriptsTable(callId: string, timestamp: DateTime): Promise<Array<Transcript> | undefined> {
    trace(`querying transcripts table ${callId} ${timestamp} ${DateTime.utc().toISO()}`);
    const readItemsCommand = new QueryCommand({
        TableName: process.env.DYNAMODB_TRANSCRIPTS_TABLENAME || "",
        KeyConditionExpression: "callId = :callId AND eventTimestamp > :eventTimestamp",
        ExpressionAttributeValues: {
            ":callId": {
                S: callId
            },
            ":eventTimestamp": {
                S: timestamp.toISO()
            }
        }
    });
    trace(`querying using command ${JSON.stringify(readItemsCommand)}`);
    const readItemsOutput = await dynamoDBClient.send(readItemsCommand);
    trace(`querying output ${JSON.stringify(readItemsOutput)}`);
    const values = readItemsOutput.Items?.map((item: Record<string, AttributeValue>): Transcript => {
        const value = {
            callId: item.callId && item.callId.S,
            callerId: item.callerId && item.callerId.S,
            endTime: item.endTime && item.endTime.N,
            eventTimestamp: item.eventTimestamp && item.eventTimestamp.S,
            resultId: item.resultId && item.resultId.S,
            speakerName: item.speakerName && item.speakerName.S,
            startTime: item.startTime && item.startTime.N,
            transcript: item.transcript && item.transcript.S
        };
        return { ...value } as Transcript;
    });
    trace(`returning values ${JSON.stringify(values)}`);
    return values;
}
