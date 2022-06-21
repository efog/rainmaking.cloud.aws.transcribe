import {
    Duration,
    Environment, RemovalPolicy, Stack, StackProps,
} from "aws-cdk-lib";
import { ITable, Table } from "aws-cdk-lib/aws-dynamodb";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
    Alias,
    Architecture, DestinationType, DockerImageCode, DockerImageFunction, DockerImageFunctionProps, IFunction, Tracing, Version,
} from "aws-cdk-lib/aws-lambda";
import { SnsDestination } from "aws-cdk-lib/aws-lambda-destinations";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { ITopic } from "aws-cdk-lib/aws-sns";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export class FunctionsStackProps implements StackProps {
    baseFunctionsImageTag?: string = "develop";
    debugNames?: string = "-not_this";
    description?: string;
    transcriptTableArn: string;
    transcriptTableV2Arn: string;
    env?: Environment;
    functionsImageRepositoryArn: string;
    functionsTargetImageTag?: string;
    tags?: {
        [key: string]: string;
    };
    destinationTopic: ITopic;
    transcriptionMessagesQueue: IQueue;
}

export class FunctionsStack extends Stack {

    private props: FunctionsStackProps | undefined;
    public lambdaExecutionRole: any;
    transcriptMessageEventFunction: DockerImageFunction;

    /**
     * Default constructor
     * @param scope {Construct} stack scope
     * @param id {string} stack id
     * @param props {FunctionsStackProps} stack properties
     */
    constructor(scope: Construct, id: string, props?: FunctionsStackProps) {
        super(scope, id, props);
        this.props = props;

        const { account, region } = Stack.of(this);
        const functionsImageRepository = Repository.fromRepositoryArn(this, "FunctionsRepositoryArn", props?.functionsImageRepositoryArn || "");
        const baseFunctionsImageTag = props?.baseFunctionsImageTag || "develop";

        let outputTopicDestination;
        if (props?.destinationTopic) {
            outputTopicDestination = new SnsDestination(props?.destinationTopic);
        }
        const transcriptsTable = Table.fromTableArn(this, "transcriptsTable", props?.transcriptTableArn || "");
        const transcriptsTableV2 = Table.fromTableArn(this, "transcriptsTableV2", props?.transcriptTableArn || "");
        const transcriptMessageEventFunction = new DockerImageFunction(this, "transcriptMessageEventFunction", ({
            ...props,
            ...{
                architecture: Architecture.X86_64,
                code: DockerImageCode.fromEcr(functionsImageRepository, {
                    tag: props?.functionsTargetImageTag || baseFunctionsImageTag,
                    cmd: ["/var/task/index.handlers.handleMessageEvent"],
                }),
                currentVersionOptions: {
                    description: `uses image tag ${props?.functionsTargetImageTag || baseFunctionsImageTag}`,
                    removalPolicy: RemovalPolicy.RETAIN,
                },
                description: "Transcripts Message Queue Handler V2",
                environment: {
                    DEBUG: props?.debugNames || "*,-not_this",
                    FUNCTIONS_IMAGE_TAG: props?.functionsTargetImageTag || baseFunctionsImageTag,
                    DYNAMODB_TRANSCRIPTS_TABLENAME: transcriptsTableV2.tableName,
                    SNS_OUTPUT_DESTINATION_TOPIC_NAME: props?.destinationTopic.topicName,
                },
                logRetention: RetentionDays.ONE_DAY,
                timeout: Duration.seconds(10),
                tracing: Tracing.ACTIVE,
            } as DockerImageFunctionProps,
        }));
        const transcriptMessageEventFunctionVersion = new Version(this, "transcriptMessageEventFunctionStagingVersion", {
            lambda: transcriptMessageEventFunction,
        });
        const transcriptMessageEventFunctionProdAlias = new Alias(this, "transcriptMessageEventFunctionProductionAlias", {
            aliasName: "prod",
            version: transcriptMessageEventFunctionVersion,
            onSuccess: outputTopicDestination,
        });
        const transcriptMessageEventFunctionStagingAlias = new Alias(this, "transcriptMessageEventFunctionStagingAlias", {
            aliasName: "staging",
            version: transcriptMessageEventFunction.latestVersion,
        });
        if (props?.transcriptionMessagesQueue) {
            const sqsTranscriptionMessageEventSource = new SqsEventSource(props?.transcriptionMessagesQueue, {
                batchSize: 1,
            });
            transcriptMessageEventFunctionProdAlias.addEventSource(sqsTranscriptionMessageEventSource);
            if (props?.destinationTopic && transcriptMessageEventFunction.role) {
                props?.destinationTopic.grantPublish(transcriptMessageEventFunction.role);
            }
        }
        this.lambdaExecutionRole = transcriptMessageEventFunction.role;
        this.transcriptMessageEventFunction = transcriptMessageEventFunction;
        transcriptsTable.grantReadWriteData(this.lambdaExecutionRole);
        transcriptsTableV2.grantReadWriteData(this.lambdaExecutionRole);
    }
}
