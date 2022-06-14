import { SendMessageCommand, SendMessageCommandOutput, SQSClient } from "@aws-sdk/client-sqs";
import { CommandSender } from "./command-sender";

/**
 * SQS service
 */
export class SQSService {
    sender: CommandSender;

    /**
     * Default constructor
     * @param sender {CommandSender} command sending interface
     */
    constructor(sender?: CommandSender | undefined) {
        if (sender) {
            this.sender = sender;
        } else {
            this.sender = new SQSClient({ region: process.env.AWS_DEFAULT_REGION || "ca-central-1" });
        }
    }

    /**
     * Sends message to queue
     * @param message {any} message to push to queue
     * @param queueUrl {string} queue url
     * @returns {string} message identifier
     */
    async sendMessage(message: any, queueUrl?: string) : Promise<string | undefined> {
        if (queueUrl) {
            const command = new SendMessageCommand({
                MessageBody: JSON.stringify(message),
                QueueUrl: queueUrl
            });
            const output = await this.sender.send(command) as SendMessageCommandOutput;
            return output.MessageId;
        }
        return undefined;
    }
}
