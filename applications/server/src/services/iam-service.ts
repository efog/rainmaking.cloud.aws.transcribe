import { STSClient, AssumeRoleCommand, AssumeRoleCommandOutput } from "@aws-sdk/client-sts";

export class IamService {
    static async assumeTranscribeStreamClientRole(roleArn: string = (process.env.TRANSCRIBESTREAM_CLIENT_ROLEARN || "")): Promise<AssumeRoleCommandOutput> {
        const client = new STSClient({ region: process.env.AWS_DEFAULT_REGION || "ca-central-1" });
        const assumeRoleCommand = new AssumeRoleCommand({
            RoleArn: roleArn,
            RoleSessionName: "TRANSCRIBESTREAM_CLIENT_SESSION"
        });
        return await client.send(assumeRoleCommand);
    }
}
