import { Environment, StackProps } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { ContainerDefinitionOptions, DeploymentController, DeploymentControllerType } from "aws-cdk-lib/aws-ecs";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ITopic } from "aws-cdk-lib/aws-sns";

/**
 * Streaming server stack properties.
 */
export class StreamingServerStackProps implements StackProps {
    description?: string;
    env?: Environment;
    tags?: {
        [key: string]: string;
    };
    repositoryArn: string;
    streamingServerAssignPublicIp: boolean = true;
    streamingServerContainerDefinition: ContainerDefinitionOptions;
    streamingServerExternalDeploymentController: DeploymentController;
    streamingServerDeploymentType: DeploymentControllerType = DeploymentControllerType.ECS;
    streamingServerDesiredTaskCount: number = 1;
    streamingServerInboundPort: number = 3000;
    targetApplicationLoadBalancerArn: string;
    targetApplicationLoadBalancerDnsName: string;
    targetApplicationLoadBalancerSecurityGroupId: string;
    targetAvailabilityZones: string[];
    targetClusterName: string;
    targetVpc: IVpc;
    streamingServerProductionListenerPort: number;
    streamingServerTestListenerPort: number;
    streamingServerProductionListenerProtocol: ApplicationProtocol;
    streamingServerTestListenerProtocol: ApplicationProtocol;
    inputTopic: ITopic;
}
