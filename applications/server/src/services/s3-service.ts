import { DateTime } from "luxon";
import Debug from "debug";
import { CloseEvent, MessageEvent, WebSocket } from "ws";
import { CompletedMultipartUpload, CompletedPart, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { convertAudioToBinaryMessage } from "./audio-services";

const debug = Debug("DEBUG::SERVER::SERVICES::s3-service.ts");
const trace = Debug("TRACE::SERVER::SERVICES::s3-service.ts");
const info = Debug("INFO::SERVER::SERVICES::s3-service.ts");
const warn = Debug("WARN::SERVER::SERVICES::s3-service.ts");
const error = Debug("ERROR::SERVER::SERVICES::s3-service.ts");

/**
 * Transcribe streaming service helper instantiation settings
 */
export interface S3StorageServiceSettings {
    /**
     * Input stream websocket
     */
    inputWebSocket: WebSocket;
    /**
     * Bucket to use
     */
    targetBucketName: string;
    /**
     * Speaker's name
     */
    speakerName: string;
    /**
     * Call identifier
     */
    callId: string;
}

export class S3Service {
    private targetBucketName: string;
    private speakerName: string;
    private callId: string;
    private s3Client: S3Client;
    private constructor(targetBucketName: string, speakerName: string, callId: string) {
        this.targetBucketName = targetBucketName;
        this.speakerName = speakerName;
        this.callId = callId;
        this.s3Client = new S3Client({ region: process.env.AWS_DEFAULT_REGION || "ca-central-1" });
    }
    static forCallFile(settings: S3StorageServiceSettings): S3Service {
        const { targetBucketName, speakerName, callId } = settings;
        const target = new S3Service(targetBucketName, speakerName, callId);
        return target;
    }
    async uploadFromAudioSocket(inputAudioSocket: WebSocket): Promise<void> {
        if (inputAudioSocket) {
            const crntDate = DateTime.utc();
            const key = `audio/${crntDate.year}/${crntDate.month}/${crntDate.day}/${crntDate.hour}/${crntDate.hour}/${crntDate.minute}-${crntDate.second}-${this.callId}-${this.speakerName}.wav`;
            const uploadMultiPartCommand = new CreateMultipartUploadCommand({
                Bucket: this.targetBucketName,
                Key: key,
                StorageClass: "ONEZONE_IA"
            });
            const uploadMultiPartCommandOutput = await this.s3Client.send(uploadMultiPartCommand);
            trace(`starting upload of ${JSON.stringify(uploadMultiPartCommandOutput)}`);
            let partNumber = 0;
            if (uploadMultiPartCommandOutput && uploadMultiPartCommandOutput.UploadId) {
                const parts: CompletedPart[] = [];
                inputAudioSocket.onmessage = async (evt: MessageEvent) => {
                    partNumber++;
                    const binData = evt.data as Buffer;
                    trace(`uploading audio ${binData.length}`);
                    const uploadPartCommand = new UploadPartCommand({
                        Bucket: uploadMultiPartCommandOutput.Bucket,
                        PartNumber: partNumber,
                        Key: uploadMultiPartCommandOutput.Key,
                        UploadId: uploadMultiPartCommandOutput.UploadId,
                        Body: binData
                    });
                    const uploadPartCommandOutput = await this.s3Client.send(uploadPartCommand);
                    parts.push({
                        ETag: uploadPartCommandOutput.ETag,
                        PartNumber: partNumber
                    });
                };
                inputAudioSocket.onclose = async (evt: CloseEvent) => {
                    const sortedParts = parts.sort((partA: CompletedPart, partB: CompletedPart) => { return (partA.PartNumber || 0) >= (partB.PartNumber || 0) ? 1 : -1; });
                    trace(`completed parts ${JSON.stringify(sortedParts)}`);
                    const completeMultipartUploadCommand = new CompleteMultipartUploadCommand({
                        Bucket: uploadMultiPartCommandOutput.Bucket,
                        Key: uploadMultiPartCommandOutput.Key,
                        UploadId: uploadMultiPartCommandOutput.UploadId,
                        MultipartUpload: {
                            Parts: sortedParts
                        }
                    });
                    try {
                        const completeMultipartUploadCommandOutput = await this.s3Client.send(completeMultipartUploadCommand);
                    } catch (err: any) {
                        error(err);
                    }
                };
            }
        }
    }
}
