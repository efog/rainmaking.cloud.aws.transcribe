import { DynamoDBClient, PutItemCommand, PutItemCommandOutput } from "@aws-sdk/client-dynamodb";
import Debug from "debug";

const debug = Debug("DEBUG::FUNCTIONS::SERVICES::dynamodb-service.ts");
const trace = Debug("TRACE::FUNCTIONS::SERVICES::dynamodb-service.ts");
const info = Debug("INFO::FUNCTIONS::SERVICES::dynamodb-service.ts");
const warn = Debug("WARN::FUNCTIONS::SERVICES::dynamodb-service.ts");
const error = Debug("ERROR::FUNCTIONS::SERVICES::dynamodb-service.ts");

const dynamboDBClient = new DynamoDBClient({
    region: process.env.AWS_DEFAULT_REGION || "ca-central-1"
});

export async function saveRecord(record: any, tableName: string, client?: DynamoDBClient | any) : Promise<PutItemCommandOutput> {
    const targetClient = (client || dynamboDBClient) as DynamoDBClient;
    const command = new PutItemCommand({
        Item: record,
        TableName: tableName,
    });
    trace(`saving with command ${JSON.stringify(command)}`);
    try {
        const output = await targetClient.send(command);
        trace(`saved with output ${JSON.stringify(output)}`);
        return output;
    }
    catch(err: any) {
        error(JSON.stringify(err));
        throw err;
    }
}
