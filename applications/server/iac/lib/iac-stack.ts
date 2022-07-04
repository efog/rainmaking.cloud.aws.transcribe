import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
    AwsLogDriver, ContainerDefinitionOptions, ContainerImage, DeploymentControllerType, Protocol,
} from "aws-cdk-lib/aws-ecs";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { CiStack } from "./ci/ci-stack";
import { CiStackProps } from "./ci/ci-stack-props";
import { FunctionsStack } from "./functions/functions-stack";
import { PipelineStack } from "./pipeline/pipeline-stack";
import { StorageStack } from "./storage/storage-stack";
import { StreamingServerStack } from "./streaming-server-stack";
import { StreamingServerStackProps } from "./streaming-server-stack-props";

export class IacStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const streamingServerLogGroup = new LogGroup(this, "streamingServerLogGroup", {
            retention: RetentionDays.ONE_DAY,
        });

        const vpc = Vpc.fromLookup(this, "importedVpc", {
            vpcId: process.env.AWSCDK_BASE_VPCID || "",
            isDefault: false,
        });

        const pipelineStack = new PipelineStack(this, "pipelineStack", Object.assign(props, {}));

        const repository = Repository.fromRepositoryName(this, "streamingServerContainerRepository", process.env.AWSCDK_ECS_STREAMINGSERVER_CONTAINER_REPOSITORY_NAME || "");
        const image = ContainerImage.fromEcrRepository(repository, "latest");
        const containerDefinition = {
            cpu: 256,
            memoryLimitMiB: 512,
            memoryReservationMiB: 512,
            portMappings: [{
                containerPort: 3000,
                protocol: Protocol.TCP,
            }],
            environment: {
                DEBUG: "*,-not_this",
                PORT: "3000",
                // TRANSCRIBESTREAM_CLIENT_ROLEARN: "arn:aws:iam::032791158701:role/StreamingServerStackstrea-transcribeClientRole786D-1Q14KX5P1TLCD",
            },
            privileged: false,
            startTimeout: Duration.seconds(30),
            stopTimeout: Duration.seconds(10),
            containerName: "streamingServer",
            image,
            healthCheck: {
                command: ["touch ~ || exit 1"],
                interval: Duration.seconds(15),
                retries: 3,
                startPeriod: Duration.seconds(120),
                timeout: Duration.seconds(5),
            },
            logging: new AwsLogDriver({
                logGroup: streamingServerLogGroup,
                streamPrefix: "streamingServer",
            }),
        } as ContainerDefinitionOptions;

        const storageStack = new StorageStack(this, "storageStack", { ...props });

        const streamingServerProps = Object.assign(props, {}) as StreamingServerStackProps;
        streamingServerProps.repositoryArn = process.env.AWSCDK_ECR_SERVERIMAGE_REPOSITORYARN || "";
        streamingServerProps.streamingServerAssignPublicIp = true;
        streamingServerProps.streamingServerContainerDefinition = containerDefinition;
        streamingServerProps.streamingServerDeploymentType = DeploymentControllerType.CODE_DEPLOY;
        streamingServerProps.streamingServerDesiredTaskCount = 1;
        streamingServerProps.streamingServerInboundPort = 3000;
        streamingServerProps.streamingServerProductionListenerPort = 3030;
        streamingServerProps.streamingServerTestListenerPort = 3131;
        streamingServerProps.streamingServerProductionListenerProtocol = ApplicationProtocol.HTTP;
        streamingServerProps.streamingServerTestListenerProtocol = ApplicationProtocol.HTTP;
        streamingServerProps.targetApplicationLoadBalancerArn = process.env.AWSCDK_ALB_ARN || "";
        streamingServerProps.targetApplicationLoadBalancerDnsName = process.env.AWSCDK_ALB_DNSNAME || "";
        streamingServerProps.targetApplicationLoadBalancerSecurityGroupId = process.env.AWSCDK_ALB_SGID || "";
        streamingServerProps.targetClusterName = process.env.AWSCDK_ECS_CLUSTER_NAME || "";
        streamingServerProps.targetVpc = vpc;
        streamingServerProps.targetAvailabilityZones = Stack.of(this).availabilityZones;
        streamingServerProps.transcriptsTableArn = storageStack.transcriptTable.tableArn;
        streamingServerProps.transcriptsTableV2Arn = storageStack.transcriptTableV2.tableArn;
        streamingServerProps.inputTopic = pipelineStack.topic;

        // eslint-disable-next-line no-unused-vars
        const streamingServerStack = new StreamingServerStack(this, "streamingServer", streamingServerProps);

        const functionsStack = new FunctionsStack(this, "functionsStack", {
            ...props,
            ...{
                transcriptTableArn: storageStack.transcriptTable.tableArn,
                transcriptTableV2Arn: storageStack.transcriptTableV2.tableArn,
                transcriptTableV3Arn: storageStack.transcriptTableV3.tableArn,
                functionsImageRepositoryArn: process.env.AWSCDK_ECR_FUNCTIONS_REPOSITORYARN || "",
                transcriptionMessagesQueue: streamingServerStack.outputQueue,
                destinationTopic: pipelineStack.topic,
            },
        });

        const ciStackProps = Object.assign(props, {
            applicationName: "streamingSpeechToTextServer",
            codeRepositoryArn: process.env.AWSCDK_CODECOMMIT_REPOSITORYARN || "",
            codeRepositoryName: process.env.AWSCDK_CODECOMMIT_REPOSITORYNAME || "",
            functionsImageRepositoryArn: process.env.AWSCDK_ECR_FUNCTIONS_REPOSITORYARN || "",
            pipelineBucketArn: process.env.AWSCDK_CODEPIPELINE_SOURCE_BUCKET_ARN || "",
            streamingServerImageRepositoryArn: process.env.AWSCDK_ECR_SERVERIMAGE_REPOSITORYARN || "",
            trancriptionMessagesHandlerFunctionArn: functionsStack.transcriptMessageEventFunction.functionArn,
            streamingServerTaskDefinitionArn: streamingServerStack.streamingServerTaskDefinition.taskDefinitionArn,
        }) as CiStackProps;
        const ciStack = new CiStack(this, "ciStack", ciStackProps);
    }
}
