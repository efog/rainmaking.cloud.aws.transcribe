import { DynamoDBClient, PutItemCommand, PutItemCommandOutput } from "@aws-sdk/client-dynamodb";

const dynamboDBClient = new DynamoDBClient({
    region: process.env.AWS_DEFAULT_REGION || "ca-central-1"
});

export async function saveRecord(record: any, tableName: string, client?: DynamoDBClient | any) : Promise<PutItemCommandOutput> {
    const targetClient = (client || dynamboDBClient) as DynamoDBClient;
    const command = new PutItemCommand({
        Item: record,
        TableName: tableName,
    });
    const output = await targetClient.send(command);
    return output;
}
