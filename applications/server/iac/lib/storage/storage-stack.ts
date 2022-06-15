import {
    Environment, Stack, StackProps,
} from "aws-cdk-lib";
import {
    AttributeType, BillingMode, Table,
} from "aws-cdk-lib/aws-dynamodb";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class StorageStackProps implements StackProps {
    description?: string;
    env?: Environment;
    executionRole?: IRole;
    tags?: {
        [key: string]: string;
    };
}

export class StorageStack extends Stack {

    private props: StorageStackProps | undefined;

    public transcriptTable: Table;

    /**
     * Default constructor
     * @param scope {Construct} stack scope
     * @param id {string} stack id
     * @param props {StorageStackProps} stack properties
     */
    constructor(scope: Construct, id: string, props?: StorageStackProps) {
        super(scope, id, props);
        this.props = props;
        const transcriptsTable = new Table(this, "transcriptsTable", {
            billingMode: BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: "callId",
                type: AttributeType.STRING,
            },
            sortKey: {
                name: "timestamp",
                type: AttributeType.STRING,
            },
        });
        transcriptsTable.addLocalSecondaryIndex({
            indexName: "resultId",
            sortKey: {
                name: "resultId",
                type: AttributeType.STRING,
            },
        });
        this.transcriptTable = transcriptsTable;
        if (props?.executionRole) {
            this.transcriptTable.grantReadWriteData(props?.executionRole);
        }
    }
}
