import {
    Environment, Stack, StackProps,
} from "aws-cdk-lib";
import {
    AttributeType, BillingMode, Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class StorageStackProps implements StackProps {
    description?: string;
    env?: Environment;
    tags?: {
        [key: string]: string;
    };
}

export class StorageStack extends Stack {

    private props: StorageStackProps | undefined;

    public transcriptTable: Table;
    public transcriptTableV2: Table;
    public transcriptTableV3: Table;

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
        transcriptsTable.addLocalSecondaryIndex({
            indexName: "eventTimestamp",
            sortKey: {
                name: "eventTimestamp",
                type: AttributeType.STRING,
            },
        });
        this.transcriptTable = transcriptsTable;

        const transcriptsTableV2 = new Table(this, "transcriptsTableV2", {
            billingMode: BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: "callId",
                type: AttributeType.STRING,
            },
            sortKey: {
                name: "eventTimestamp",
                type: AttributeType.STRING,
            },
        });
        transcriptsTableV2.addLocalSecondaryIndex({
            indexName: "resultId",
            sortKey: {
                name: "resultId",
                type: AttributeType.STRING,
            },
        });
        this.transcriptTableV2 = transcriptsTableV2;

        const transcriptsTableV3 = new Table(this, "transcriptsTableV3", {
            billingMode: BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: "callId",
                type: AttributeType.STRING,
            },
            sortKey: {
                name: "resultId",
                type: AttributeType.STRING,
            },
        });
        transcriptsTableV3.addLocalSecondaryIndex({
            indexName: "eventTimestamp",
            sortKey: {
                name: "eventTimestamp",
                type: AttributeType.STRING,
            },
        });
        this.transcriptTableV3 = transcriptsTableV3;
    }
}
