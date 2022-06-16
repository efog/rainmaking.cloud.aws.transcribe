import { DynamoDBClient, PutItemCommandOutput } from "@aws-sdk/client-dynamodb";
export declare function saveRecord(record: any, tableName: string, client?: DynamoDBClient | any): Promise<PutItemCommandOutput>;
