import { EventStreamMarshaller, Message } from "@aws-sdk/eventstream-marshaller";
import * as util_utf8_node from "@aws-sdk/util-utf8-node";

const eventStreamMarshaller = new EventStreamMarshaller(util_utf8_node.toUtf8, util_utf8_node.fromUtf8);

export function getAudioEventMessage(buffer: Buffer): Message {
    return {
        headers: {
            ":message-type": {
                type: "string",
                value: "event"
            },
            ":event-type": {
                type: "string",
                value: "AudioEvent"
            }
        },
        body: buffer
    };
}

export function convertAudioToBinaryMessage(audioData: ArrayBuffer): Uint8Array {
    const audioEventMessage = getAudioEventMessage(Buffer.from(audioData));
    const binary = eventStreamMarshaller.marshall(audioEventMessage);
    return binary;
}
