import { Environment, Stack, StackProps } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AllowedMethods, CachePolicy, Distribution, OriginAccessIdentity, OriginRequestPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from "path";

export class StaticWebsiteStackProps implements StackProps {
    websiteName?: string;
    websiteAcmCertificateArn?: string;
    websiteDomain?: string;
    description?: string;
    env?: Environment;
    tags?: {
        [key: string]: string;
    };
}

export class StaticWebsiteStack extends Stack {
    bucketDeployment: BucketDeployment;
    staticWebsiteDistribution: Distribution;
    staticWebSiteBucket: Bucket;
    staticWebsiteAcmCertificate: any;
    constructor(scope: Construct, id: string, props?: StaticWebsiteStackProps) {
        super(scope, id, props);
        this.staticWebSiteBucket = new Bucket(this, `${props?.websiteName}_staticwebsite_bucket`, {
            "publicReadAccess": false,
            "blockPublicAccess": {
                "blockPublicAcls": true,
                "blockPublicPolicy": true,
                "ignorePublicAcls": true,
                "restrictPublicBuckets": true
            },
            "encryption": BucketEncryption.S3_MANAGED,
        });
        const staticWebsiteDistributionIdentity = new OriginAccessIdentity(this, `${props?.websiteName}_staticwebsite_distribution_identity`, {});
        this.staticWebSiteBucket.grantRead(staticWebsiteDistributionIdentity);
        if (props?.websiteAcmCertificateArn) {
            this.staticWebsiteAcmCertificate = Certificate.fromCertificateArn(this, `${props?.websiteName}_staticwebsite_distribution_certificate`, props?.websiteAcmCertificateArn || "");
        }
        this.staticWebsiteDistribution = new Distribution(this, `${props?.websiteName}_staticwebsite_distribution`, {
            "certificate": props?.websiteAcmCertificateArn && this.staticWebsiteAcmCertificate,
            "defaultBehavior": {
                "allowedMethods": AllowedMethods.ALLOW_GET_HEAD,
                "origin": new S3Origin(this.staticWebSiteBucket, {
                    "originAccessIdentity": staticWebsiteDistributionIdentity
                }),
                "viewerProtocolPolicy": ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                "cachePolicy": CachePolicy.CACHING_OPTIMIZED,
                "smoothStreaming": false,
                "originRequestPolicy": OriginRequestPolicy.USER_AGENT_REFERER_HEADERS
            },
            "defaultRootObject": "index.html",
            "domainNames": props?.websiteDomain ? [props?.websiteDomain] : [],
            "errorResponses": []
        });
        this.bucketDeployment = new BucketDeployment(this, `${props?.websiteName}_staticwebsite_deployment`, {
            destinationBucket: this.staticWebSiteBucket,
            sources: [Source.asset(path.resolve(process.cwd(), "../build"))]
        });
    }
}