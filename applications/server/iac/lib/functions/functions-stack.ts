import {
    Duration,
    Environment, RemovalPolicy, Stack, StackProps,
} from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
    Alias,
    Architecture, DockerImageCode, DockerImageFunction, DockerImageFunctionProps, Tracing,
} from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class FunctionsStackProps implements StackProps {
    baseFunctionsImageTag?: string = "develop";
    debugNames?: string = "-not_this";
    description?: string;
    env?: Environment;
    functionsImageRepositoryArn: string;
    functionsTargetImageTag?: string;
    tags?: {
        [key: string]: string;
    };
}

export class FunctionsStack extends Stack {

    private props: FunctionsStackProps | undefined;
    public lambdaExecutionRole: any;

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
        const transcriptMessageEventFunction = new DockerImageFunction(this, "transcriptMessageEventFunction", ({
            ...props,
            ...{
                architecture: Architecture.X86_64,
                code: DockerImageCode.fromEcr(functionsImageRepository, {
                    tag: props?.functionsTargetImageTag || baseFunctionsImageTag,
                    cmd: ["/var/task/src/handlers/index.functions.transcriptMessageEvent"],
                }),
                currentVersionOptions: {
                    description: `uses image tag ${props?.functionsTargetImageTag || baseFunctionsImageTag}`,
                    removalPolicy: RemovalPolicy.RETAIN,
                },
                description: "Transcripts Message Queue Handler",
                environment: {
                    DEBUG: props?.debugNames || "-not_this",
                    FUNCTIONS_IMAGE_TAG: props?.functionsTargetImageTag || baseFunctionsImageTag,
                },
                logRetention: RetentionDays.ONE_DAY,
                timeout: Duration.seconds(10),
                tracing: Tracing.ACTIVE,
            } as DockerImageFunctionProps,
        }));
        const transcriptMessageEventFunctionAlias = new Alias(this, "transcriptMessageEventFunctionStagingAlias", {
            aliasName: "staging",
            version: transcriptMessageEventFunction.currentVersion,
        });
        this.lambdaExecutionRole = transcriptMessageEventFunction.role;
    }
}
