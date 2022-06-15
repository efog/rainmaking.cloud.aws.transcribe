"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.event = void 0;
const dynamodb_service_1 = require("../services/dynamodb-service");
/**
 * Handles event from SQS queue
 * @param event {SQSEvent} SQS payload
 * @returns {Promise<APIGatewayProxyResultV2>} handler result
 */
async function event(event) {
    const messages = event.Records.map((record) => {
        const body = JSON.parse(record.body);
        return body;
    });
    const saveRecords = messages.map((message) => {
        const callId = message.callId;
        const endTime = message.Results[0].EndTime;
        const items = message.Results[0].Alternatives[0].Items;
        const resultId = message.Results[0].ResultId;
        const speakerName = message.speakerName;
        const startTime = message.Results[0].StartTime;
        const transcript = message.Results[0].Alternatives[0].Transcript;
        const record = { callId, endTime, items, resultId, speakerName, startTime, transcript };
        return (0, dynamodb_service_1.saveRecord)(record, process.env.DYNAMODB_TRANSCRIPTS_TABLENAME || "");
    });
    await saveRecords;
    return {
        statusCode: 200
    };
}
exports.event = event;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxtRUFBMEQ7QUEyQjFEOzs7O0dBSUc7QUFDSSxLQUFLLFVBQVUsS0FBSyxDQUFDLEtBQWU7SUFDdkMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUMxQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQTJCLENBQUM7UUFDL0QsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBK0IsRUFBRSxFQUFFO1FBQ2pFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDOUIsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDM0MsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3ZELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQzdDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7UUFDeEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDL0MsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1FBQ2pFLE1BQU0sTUFBTSxHQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLENBQUM7UUFDekYsT0FBTyxJQUFBLDZCQUFVLEVBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLElBQUksRUFBRSxDQUFDLENBQUM7SUFDaEYsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLFdBQVcsQ0FBQztJQUNsQixPQUFPO1FBQ0gsVUFBVSxFQUFFLEdBQUc7S0FDbEIsQ0FBQztBQUNOLENBQUM7QUFwQkQsc0JBb0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5UmVzdWx0VjIsIFNRU0V2ZW50IH0gZnJvbSBcImF3cy1sYW1iZGFcIjtcbmltcG9ydCB7IHNhdmVSZWNvcmQgfSBmcm9tIFwiLi4vc2VydmljZXMvZHluYW1vZGItc2VydmljZVwiO1xuXG4vKipcbiAqIFRyYW5zY3JpYmUgcmVzdWx0IGV2ZW50IG1lc3NhZ2Ugc3RydWN0dXJlXG4gKi9cbmV4cG9ydCB0eXBlIFRyYW5zY3JpYmVNZXNzYWdlRXZlbnQgPSB7XG4gICAgUmVzdWx0czogW3tcbiAgICAgICAgQWx0ZXJuYXRpdmVzOiBbe1xuICAgICAgICAgICAgSXRlbXM6IFt7XG4gICAgICAgICAgICAgICAgQ29udGVudDogc3RyaW5nLFxuICAgICAgICAgICAgICAgIEVuZFRpbWU6IG51bWJlcixcbiAgICAgICAgICAgICAgICBTdGFibGU6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgU3RhcnRUaW1lOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgVHlwZTogc3RyaW5nLFxuICAgICAgICAgICAgICAgIFZvY2FidWxhcnlGaWx0ZXJNYXRjaDogZmFsc2VcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgVHJhbnNjcmlwdDogc3RyaW5nXG4gICAgICAgIH1dLFxuICAgICAgICBFbmRUaW1lOiBudW1iZXIsXG4gICAgICAgIElzUGFydGlhbDogYm9vbGVhbixcbiAgICAgICAgUmVzdWx0SWQ6IHN0cmluZyxcbiAgICAgICAgU3RhcnRUaW1lOiBudW1iZXJcbiAgICB9XSxcbiAgICBzcGVha2VyTmFtZTogc3RyaW5nLFxuICAgIGNhbGxJZDogc3RyaW5nXG59XG5cbi8qKlxuICogSGFuZGxlcyBldmVudCBmcm9tIFNRUyBxdWV1ZVxuICogQHBhcmFtIGV2ZW50IHtTUVNFdmVudH0gU1FTIHBheWxvYWRcbiAqIEByZXR1cm5zIHtQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdFYyPn0gaGFuZGxlciByZXN1bHRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV2ZW50KGV2ZW50OiBTUVNFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0VjI+IHtcbiAgICBjb25zdCBtZXNzYWdlcyA9IGV2ZW50LlJlY29yZHMubWFwKChyZWNvcmQpID0+IHtcbiAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVjb3JkLmJvZHkpIGFzIFRyYW5zY3JpYmVNZXNzYWdlRXZlbnQ7XG4gICAgICAgIHJldHVybiBib2R5O1xuICAgIH0pO1xuICAgIGNvbnN0IHNhdmVSZWNvcmRzID0gbWVzc2FnZXMubWFwKChtZXNzYWdlOiBUcmFuc2NyaWJlTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IGNhbGxJZCA9IG1lc3NhZ2UuY2FsbElkO1xuICAgICAgICBjb25zdCBlbmRUaW1lID0gbWVzc2FnZS5SZXN1bHRzWzBdLkVuZFRpbWU7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gbWVzc2FnZS5SZXN1bHRzWzBdLkFsdGVybmF0aXZlc1swXS5JdGVtcztcbiAgICAgICAgY29uc3QgcmVzdWx0SWQgPSBtZXNzYWdlLlJlc3VsdHNbMF0uUmVzdWx0SWQ7XG4gICAgICAgIGNvbnN0IHNwZWFrZXJOYW1lID0gbWVzc2FnZS5zcGVha2VyTmFtZTtcbiAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gbWVzc2FnZS5SZXN1bHRzWzBdLlN0YXJ0VGltZTtcbiAgICAgICAgY29uc3QgdHJhbnNjcmlwdCA9IG1lc3NhZ2UuUmVzdWx0c1swXS5BbHRlcm5hdGl2ZXNbMF0uVHJhbnNjcmlwdDtcbiAgICAgICAgY29uc3QgcmVjb3JkID0gIHsgY2FsbElkLCBlbmRUaW1lLCBpdGVtcywgcmVzdWx0SWQsIHNwZWFrZXJOYW1lLCBzdGFydFRpbWUsIHRyYW5zY3JpcHQgfTtcbiAgICAgICAgcmV0dXJuIHNhdmVSZWNvcmQocmVjb3JkLCBwcm9jZXNzLmVudi5EWU5BTU9EQl9UUkFOU0NSSVBUU19UQUJMRU5BTUUgfHwgXCJcIik7XG4gICAgfSk7XG4gICAgYXdhaXQgc2F2ZVJlY29yZHM7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwXG4gICAgfTtcbn1cbiJdfQ==