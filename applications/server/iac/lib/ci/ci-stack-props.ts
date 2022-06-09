import { Environment, StackProps } from "aws-cdk-lib";

export class CiStackProps implements StackProps {
    applicationName: string;
    codeRepositoryArn?: string;
    codeRepositoryName?: string;
    description?: string;
    env?: Environment;
    repositoryArn: string;
    tags?: {
        [key: string]: string;
    };
}