import { APIGatewayProxyResultV2, SQSEvent } from "aws-lambda";
/**
 * Transcribe result event message structure
 */
export declare type TranscribeMessageEvent = {
    Results: [
        {
            Alternatives: [
                {
                    Items: [
                        {
                            Content: string;
                            EndTime: number;
                            Stable: boolean;
                            StartTime: number;
                            Type: string;
                            VocabularyFilterMatch: false;
                        }
                    ];
                    Transcript: string;
                }
            ];
            EndTime: number;
            IsPartial: boolean;
            ResultId: string;
            StartTime: number;
        }
    ];
    speakerName: string;
    callId: string;
};
/**
 * Handles event from SQS queue
 * @param event {SQSEvent} SQS payload
 * @returns {Promise<APIGatewayProxyResultV2>} handler result
 */
export declare function event(event: SQSEvent): Promise<APIGatewayProxyResultV2>;
