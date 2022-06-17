import { Environment, StackProps } from "aws-cdk-lib";
import { IFunction } from "aws-cdk-lib/aws-lambda";

export class CiStackProps implements StackProps {
    applicationName: string;
    codeRepositoryArn?: string;
    codeRepositoryName?: string;
    description?: string;
    env?: Environment;
    functionsImageRepositoryArn: string;
    pipelineBucketArn: string;
    streamingServerImageRepositoryArn: string;
    trancriptionMessagesHandlerFunction: IFunction;
    tags?: {
        [key: string]: string;
    };
}
