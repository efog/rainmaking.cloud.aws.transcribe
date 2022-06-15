import { Repository as CodeRepository } from "aws-cdk-lib/aws-codecommit";
import { Construct } from "constructs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Repository as ContainerImageRepository } from "aws-cdk-lib/aws-ecr";
import {
    Artifacts, BuildSpec, ComputeType, LinuxBuildImage, Project, Source,
} from "aws-cdk-lib/aws-codebuild";
import { Stack } from "aws-cdk-lib";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CiStackProps } from "./ci-stack-props";

export class CiStack extends Stack {
    constructor(scope: Construct, id: string, props: CiStackProps) {
        super(scope, id, props);
        const accountNumber = Stack.of(this).account;
        const { region } = Stack.of(this);
        const pipelineBucket = Bucket.fromBucketArn(this, "pipelineBucket", props?.pipelineBucketArn || "");
        const streamingServerImageRepository = ContainerImageRepository.fromRepositoryArn(this, "streamingServerImageRepository", props?.streamingServerImageRepositoryArn);
        const functionsImageRepository = ContainerImageRepository.fromRepositoryArn(this, "functionsImageRepository", props?.functionsImageRepositoryArn);
        const codeRepository = (props?.codeRepositoryArn
            && CodeRepository.fromRepositoryArn(this, "codeRepository", "arn:aws:codecommit:ca-central-1:032791158701:rainmaking.cloud.aws.transcribe"))
            || CodeRepository.fromRepositoryName(this, "codeRepository", "rainmaking.cloud.aws.transcribe");
        const developSource = Source.codeCommit({
            repository: codeRepository,
            branchOrRef: "develop",
            identifier: "developSource",
        });
        const buildArtifactsBucket = new Bucket(this, "streamingServerBuildArtifactsBucket", {
            publicReadAccess: false,
            versioned: true,
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            encryption: BucketEncryption.S3_MANAGED,
        });
        const streamingServerBuilderDevelopBuildProject = new Project(this, "streamingServerBuilderDevelopBuildProject", {
            source: developSource,
            projectName: `${props?.applicationName}_develop_build`,
            description: `${props?.applicationName} develop branch build project`,
            buildSpec: BuildSpec.fromSourceFilename("applications/server/src/buildspec.yaml"),
            artifacts: Artifacts.s3({
                bucket: buildArtifactsBucket,
            }),
            environmentVariables: {
                IMAGE_REPO_NAME: {
                    value: streamingServerImageRepository.repositoryName,
                },
                IMAGE_TAG: {
                    value: "develop",
                },
                AWS_ACCOUNT_ID: {
                    value: accountNumber,
                },
                AWS_DEFAULT_REGION: {
                    value: region,
                },
            },
            environment: {
                buildImage: LinuxBuildImage.STANDARD_5_0,
                computeType: ComputeType.SMALL,
                privileged: true,
            },
            logging: {
                cloudWatch: {
                    logGroup: new LogGroup(this, `${props?.applicationName}_app_build`, {
                        retention: RetentionDays.ONE_DAY,
                        logGroupName: `${props?.applicationName}_app_build`,
                    }),
                    prefix: "develop/server",
                },
            },
        });
        if (streamingServerBuilderDevelopBuildProject.role) {
            streamingServerImageRepository.grantPullPush(streamingServerBuilderDevelopBuildProject.role);
            buildArtifactsBucket.grantReadWrite(streamingServerBuilderDevelopBuildProject.role);
            streamingServerBuilderDevelopBuildProject.role.addToPrincipalPolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "ecs:ListTaskDefinitions",
                    "ecs:DescribeTaskDefinition",
                    "ecs:RegisterTaskDefinition",
                ],
                resources: [
                    "*",
                ],
            }));
            pipelineBucket.grantReadWrite(streamingServerBuilderDevelopBuildProject.role);
        }

        const functionsBuilderDevelopBuildProject = new Project(this, "functionsBuilderDevelopBuildProject", {
            source: developSource,
            projectName: `${props?.applicationName}_functions_develop_build`,
            description: `${props?.applicationName} functions develop branch build project`,
            buildSpec: BuildSpec.fromSourceFilename("applications/server/functions/buildspec.yaml"),
            artifacts: Artifacts.s3({
                bucket: buildArtifactsBucket,
            }),
            environmentVariables: {
                IMAGE_REPO_NAME: {
                    value: functionsImageRepository.repositoryName,
                },
                IMAGE_TAG: {
                    value: "develop",
                },
                AWS_ACCOUNT_ID: {
                    value: accountNumber,
                },
                AWS_DEFAULT_REGION: {
                    value: region,
                },
            },
            environment: {
                buildImage: LinuxBuildImage.STANDARD_5_0,
                computeType: ComputeType.SMALL,
                privileged: true,
            },
            logging: {
                cloudWatch: {
                    logGroup: new LogGroup(this, `${props?.applicationName}_functions_app_build`, {
                        retention: RetentionDays.ONE_DAY,
                        logGroupName: `${props?.applicationName}_functions_app_build`,
                    }),
                    prefix: "develop/functions",
                },
            },
        });
        if (functionsBuilderDevelopBuildProject.role) {
            functionsImageRepository.grantPullPush(functionsBuilderDevelopBuildProject.role);
            buildArtifactsBucket.grantReadWrite(functionsBuilderDevelopBuildProject.role);
            pipelineBucket.grantReadWrite(functionsBuilderDevelopBuildProject.role);
        }
    }
}
