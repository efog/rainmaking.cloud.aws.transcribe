import { Environment, Stack, StackProps } from "aws-cdk-lib";
import { IdentitySource } from "aws-cdk-lib/aws-apigateway";
import { Topic, TopicProps } from "aws-cdk-lib/aws-sns";

export class PipelineStackProps implements StackProps {
    description?: string;
    env?: Environment;
    tags?: {
        [key: string]: string;
    };
}

export class PipelineStack extends Stack {

    topic: Topic;

    /**
     * Default constructor
     * @param scope {Stack} Stack scope
     * @param id {string} Stack identifier
     * @param props {PipelineStackProps} pipeline stack properties
     */
    constructor(scope: Stack, id: string, props: PipelineStackProps) {
        super(scope, id, props);
        this.topic = new Topic(this, "notificationTopic", Object.assign(props as StackProps, {
        } as TopicProps));
    }
}
