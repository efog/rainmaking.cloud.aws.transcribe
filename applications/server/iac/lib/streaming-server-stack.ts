/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import {
    Duration, Stack,
} from "aws-cdk-lib";
import {
    ISecurityGroup,
    IVpc, Port, SecurityGroup, SubnetType,
} from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
    Cluster,
    Compatibility,
    ContainerDefinitionOptions,
    DeploymentController,
    DeploymentControllerType,
    FargatePlatformVersion,
    FargateService,
    ICluster,
    NetworkMode,
    Protocol,
    TaskDefinition,
    TaskDefinitionProps,
} from "aws-cdk-lib/aws-ecs";
import {
    ApplicationListener,
    ApplicationLoadBalancer, ApplicationProtocol, ApplicationProtocolVersion, ApplicationTargetGroup, ApplicationTargetGroupProps, IApplicationLoadBalancer, ListenerAction, TargetType,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {
    Effect, PolicyDocument, PolicyDocumentProps, PolicyStatement, Role, ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { StreamingServerStackProps } from "./streaming-server-stack-props";

/**
 * Streaming serving stack
 */
export class StreamingServerStack extends Stack {

    applicationLoadBalancer: IApplicationLoadBalancer;
    applicationLoadBalancerSecurityGroup: ISecurityGroup;
    cluster: ICluster;
    executionRole: Role;
    props: StreamingServerStackProps | undefined;
    streamingServerClusterService: FargateService;
    streamingServerDeploymentController: DeploymentController | any;
    streamingServerLogGroup: LogGroup;
    streamingServerSecurityGroup: SecurityGroup;
    streamingServerTaskDefinition: TaskDefinition;
    taskRole: Role;
    vpc: IVpc | undefined;
    streamingServerApplicationLoadBalancerProductionListener: ApplicationListener;
    streamingServerApplicationLoadBalancerTestListener: ApplicationListener;
    transcribeClientRole: Role;

    /**
     * Default constructor
     * @param scope {Construct} stack scope
     * @param id {string} stack id
     * @param props {StreamingServerStackProps} stack properties
     */
    constructor(scope: Construct, id: string, props?: StreamingServerStackProps) {
        super(scope, id, props);
        this.props = props;
        this.addStreamingServer();
    }

    /**
     * Adds streaming server to stack
     */
    addStreamingServer() {

        // Set VPC
        this.vpc = this.props?.targetVpc;

        // Acquire Application Load Balancer
        this.applicationLoadBalancerSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            "streamingServerApplicationLoadBalancerSecurityGroup",
            this.props?.targetApplicationLoadBalancerSecurityGroupId || "",
        );
        this.applicationLoadBalancer = ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(
            this,
            "streamingServerApplicationLoadBalancer",
            {
                loadBalancerArn: this.props?.targetApplicationLoadBalancerArn || "",
                securityGroupId: this.applicationLoadBalancerSecurityGroup.securityGroupId,
                vpc: this.props?.targetVpc,
                loadBalancerDnsName: this.props?.targetApplicationLoadBalancerDnsName || "",
            },
        );
        this.streamingServerApplicationLoadBalancerProductionListener = this.applicationLoadBalancer.addListener("productionListener", {
            port: this.props?.streamingServerProductionListenerPort || 3030,
            protocol: this.props?.streamingServerProductionListenerProtocol || ApplicationProtocol.HTTP,
        });
        const repository = Repository.fromRepositoryArn(this, "streamingServerImageRepository", this.props?.repositoryArn || "");

        // Setup roles
        this.executionRole = new Role(this, "streamingServerExecutionRole", {
            assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
            description: "Role for agent task",
            inlinePolicies: {
                cloudwatch: new PolicyDocument({
                    assignSids: true,
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ["logs:CreateLogStream"],
                            resources: [`arn:aws:logs:*:${Stack.of(this).account}:log-group:*`],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ["logs:PutLogEvents"],
                            resources: [`arn:aws:logs:*:${Stack.of(this).account}:log-group:*:log-stream:*`],
                        }),
                    ],
                }),
            },
        });
        repository.grantPull(this.executionRole);
        this.taskRole = new Role(this, "streamingServerTaskRole", {
            assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
            description: "Role for website task",
        });

        this.transcribeClientRole = new Role(this, "transcribeClientRole", {
            assumedBy: this.taskRole,
            inlinePolicies: {
                allowTranscribeClient: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ["transcribe:StartStreamTranscription"],
                            resources: ["*"],
                        }),
                    ],
                }),
            },
        });

        this.streamingServerLogGroup = new LogGroup(this, "streamingServerLogGroup", {
            retention: RetentionDays.ONE_DAY,
        });
        this.streamingServerLogGroup.grantWrite(this.executionRole);

        this.streamingServerSecurityGroup = new SecurityGroup(this, "streamingServerSecurityGroup", {
            description: "streaming server task security group",
            vpc: (this.vpc) as IVpc,
            allowAllOutbound: true,
        });
        this.streamingServerSecurityGroup.addIngressRule(
            this.applicationLoadBalancerSecurityGroup,
            Port.tcp(this.props?.streamingServerInboundPort || 3000),
            "allow calls to streaming server",
            false,
        );

        // Setup cluster
        this.cluster = Cluster.fromClusterAttributes(this, "streamingServerTargetEcsCluster", {
            clusterName: this.props?.targetClusterName || "",
            vpc: this.vpc as IVpc,
            securityGroups: [this.streamingServerSecurityGroup],
        });
        const taskDefinitionProps = {
            ...this.props,
            ...{
                compatibility: Compatibility.FARGATE,
                networkMode: NetworkMode.AWS_VPC,
                inferenceAccelerators: undefined,
                ipcMode: undefined,
                pidMode: undefined,
                placementConstraints: undefined,
                cpu: "256",
                memoryMiB: "512",
            } as TaskDefinitionProps,
        };
        taskDefinitionProps.executionRole = this.executionRole;
        taskDefinitionProps.taskRole = this.taskRole;

        this.streamingServerTaskDefinition = new TaskDefinition(this, "applicationTaskDefinition", taskDefinitionProps);
        this.streamingServerTaskDefinition.addContainer("container0", { ...this.props?.streamingServerContainerDefinition } as ContainerDefinitionOptions);

        this.streamingServerDeploymentController = this.props?.streamingServerDeploymentType === DeploymentControllerType.ECS ? {
            type: DeploymentControllerType.ECS,
        } as DeploymentController : this.props?.streamingServerDeploymentType === DeploymentControllerType.CODE_DEPLOY ? {
            type: DeploymentControllerType.CODE_DEPLOY,
        } : this.props?.streamingServerExternalDeploymentController;

        this.streamingServerClusterService = new FargateService(this, "streamingserverFargateService", {
            assignPublicIp: this.props?.streamingServerAssignPublicIp,
            cluster: this.cluster,
            vpcSubnets: this.vpc?.selectSubnets({
                subnetType: SubnetType.PUBLIC,
            }),
            taskDefinition: this.streamingServerTaskDefinition,
            desiredCount: this.props?.streamingServerDesiredTaskCount,
            healthCheckGracePeriod: Duration.seconds(120),
            platformVersion: FargatePlatformVersion.LATEST,
            securityGroups: [this.streamingServerSecurityGroup],
            deploymentController: this.streamingServerDeploymentController,
            capacityProviderStrategies: [
                {
                    capacityProvider: "FARGATE_SPOT",
                    weight: 2,
                },
                {
                    capacityProvider: "FARGATE",
                    weight: 1,
                },
            ],
        });

        this.streamingServerApplicationLoadBalancerProductionListener.addTargets("streamingServerProductionTargetGroup", {
            deregistrationDelay: Duration.seconds(30),
            healthCheck: {
                enabled: true,
                healthyHttpCodes: "200,299",
                healthyThresholdCount: 3,
                interval: Duration.seconds(30),
                path: "/api/stt/healthcheck",
                port: `${this.props?.streamingServerInboundPort}`,
                timeout: Duration.seconds(10),
                unhealthyThresholdCount: 5,
            },
            targets: [this.streamingServerClusterService.loadBalancerTarget({
                containerName: "streamingServer",
                containerPort: this.props?.streamingServerInboundPort,
                protocol: Protocol.TCP,
            })],
            port: 80,
            protocol: ApplicationProtocol.HTTP,
            protocolVersion: ApplicationProtocolVersion.HTTP1,
        });

        if (this.props?.streamingServerDeploymentType === DeploymentControllerType.CODE_DEPLOY) {
            this.streamingServerApplicationLoadBalancerTestListener = this.applicationLoadBalancer.addListener("testListener", {
                port: this.props.streamingServerTestListenerPort || 3131,
                protocol: this.props.streamingServerProductionListenerProtocol || ApplicationProtocol.HTTP,
                defaultAction: ListenerAction.fixedResponse(200, { messageBody: "This is the ALB Default Action" }),
            });
            const streamingServerTestTargetGroup = {
                deregistrationDelay: Duration.seconds(30),
                healthCheck: {
                    enabled: true,
                    healthyHttpCodes: "200,299",
                    healthyThresholdCount: 3,
                    interval: Duration.seconds(30),
                    path: "/api/stt/healthcheck",
                    port: `${this.props?.streamingServerInboundPort}`,
                    timeout: Duration.seconds(10),
                    unhealthyThresholdCount: 5,
                },
                port: 80,
                vpc: this.vpc,
                protocol: ApplicationProtocol.HTTP,
                protocolVersion: ApplicationProtocolVersion.HTTP1,
                targetType: TargetType.IP,
            } as ApplicationTargetGroupProps;
            this.streamingServerApplicationLoadBalancerTestListener.addTargetGroups("test", {
                targetGroups: [new ApplicationTargetGroup(this, "streamingServerTargetGroupGreen", streamingServerTestTargetGroup)],
            });
        }
    }
}
