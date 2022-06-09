import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
    AwsLogDriver, ContainerDefinitionOptions, ContainerImage, DeploymentControllerType, Protocol,
} from "aws-cdk-lib/aws-ecs";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { CiStackProps } from "./ci/ci-stack-props";
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

        const streamingServerProps = Object.assign(props, {}) as StreamingServerStackProps;
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

        // eslint-disable-next-line no-unused-vars
        const streamingServerStack = new StreamingServerStack(this, "streamingServer", streamingServerProps);

        const ciStackProps = Object.assign(props, {
            applicationName: "streamingSpeechToTextServer",
            codeRepositoryArn: process.env.AWSCDK_CODECOMMIT_REPOSITORYARN || "",
        }) as CiStackProps;
    }
}
