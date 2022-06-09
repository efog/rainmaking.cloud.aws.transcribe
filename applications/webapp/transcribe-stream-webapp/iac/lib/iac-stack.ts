import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StaticWebsiteStack } from './static-website-stack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class IacStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        new StaticWebsiteStack(this, "staticWebsite", Object.assign(props, {
            "streamingServerDnsName": process.env.STREAMING_SERVER_ALB_DNSNAME || "",
            "websiteName": "speachtotext-streaming-demo",
            "websiteAcmCertificateArn": process.env.STATICWEBSITE_HTTPS_ACM_CERTIFICATE_ARN || "",
            "websiteDomain": process.env.STATICWEBSITE_DOMAIN || "",
        }))
        // The code that defines your stack goes here

        // example resource
        // const queue = new sqs.Queue(this, 'IacQueue', {
        //   visibilityTimeout: cdk.Duration.seconds(300)
        // });
    }
}
