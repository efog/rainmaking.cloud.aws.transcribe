import { Environment, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

export class StreamingServerStackProps implements StackProps {
    description?: string;
    env?: Environment;
    tags?: {
        [key: string]: string;
    };
}

export class StreamingServerStack extends Stack {
    constructor(scope: Construct, id: string, props?: StreamingServerStackProps) {
        super(scope, id, props);
        // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'IacQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
    }
}
