import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
} from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";
import {
  CloudFrontWebDistribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { LambdaRestApi, Cors } from "aws-cdk-lib/aws-apigateway";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create frontend resources
    const frontend = new FrontendResources(this, "FrontendResources");

    // Create file upload resources
    const fileUpload = new FileUploadResources(
      this,
      "FileUploadResources",
      frontend.frontendBucket
    );

    // Output CloudFront distribution URL
    new cdk.CfnOutput(this, "CloudFrontDistributionUrl", {
      value: `https://${frontend.distribution.distributionDomainName}`,
      description: "URL for CloudFront distribution",
    });

    // Output S3 bucket URL for frontend
    new cdk.CfnOutput(this, "FrontendBucketUrl", {
      value: frontend.frontendBucket.bucketWebsiteUrl,
      description: "URL for frontend bucket",
    });

    // Output API Gateway URL
    new cdk.CfnOutput(this, "FileUploadApiUrl", {
      value: fileUpload.api.url,
      description: "URL for file uploads API",
    });

    // Output S3 bucket URL for file uploads
    new cdk.CfnOutput(this, "FileUploadBucketUrl", {
      value: fileUpload.fileUploadBucket.bucketWebsiteUrl,
      description: "URL for file uploads",
    });
  }
}

class FrontendResources extends Construct {
  public readonly frontendBucket: Bucket;
  public readonly distribution: CloudFrontWebDistribution;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create Route 53 hosted zone
    const hostedZone = HostedZone.fromLookup(this, "HostedZone", {
      domainName: "devmellio.com",
    });

    // Create certificate for subdomain
    const certificate = new Certificate(this, "Certificate", {
      domainName: "method.devmellio.com",
      validation: CertificateValidation.fromDns(hostedZone),
    });

    // Create S3 bucket for hosting frontend
    this.frontendBucket = new Bucket(this, "FrontendBucket", {
      bucketName: "method.devmellio.com",
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      enforceSSL: true,
      versioned: false,
    });

    // Create CloudFront distribution
    this.distribution = new CloudFrontWebDistribution(
      this,
      "CloudFrontDistribution",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: this.frontendBucket,
              originAccessIdentity: new OriginAccessIdentity(
                this,
                "OriginAccessIdentity"
              ),
            },
            behaviors: [
              {
                isDefaultBehavior: true,
              },
            ],
          },
        ],
        viewerCertificate: {
          aliases: ["method.devmellio.com"],
          props: {
            acmCertificateArn: certificate.certificateArn,
            sslSupportMethod: "sni-only",
          },
        },
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      }
    );

    // Create Route 53 A record for CloudFront distribution
    new ARecord(this, "CloudFrontAliasRecord", {
      zone: hostedZone,
      recordName: "method.devmellio.com",
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
    });
  }
}

class FileUploadResources extends Construct {
  public readonly fileUploadBucket: Bucket;
  public readonly api: LambdaRestApi;

  constructor(scope: Construct, id: string, frontendBucket: Bucket) {
    super(scope, id);

    // Create S3 bucket for file uploads
    this.fileUploadBucket = new Bucket(this, "FileUploadBucket", {
      bucketName: "dunkin-donuts-file-upload",
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      enforceSSL: true,
      versioned: false,
      cors: [
        {
          allowedOrigins: ["https://method.devmellio.com"],
          allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST],
          allowedHeaders: ["*"],
        },
      ],
    });

    // Create Lambda function for file uploads
    const uploadFunction = new Function(this, "FileUploadFunction", {
      runtime: Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: Code.fromAsset("lambda"),
      environment: {
        BUCKET_NAME: this.fileUploadBucket.bucketName,
      },
    });

    this.fileUploadBucket.grantWrite(uploadFunction);

    // Create API Gateway for file uploads
    this.api = new LambdaRestApi(this, "FileUploadApi", {
      handler: uploadFunction,
      restApiName: "FileUploadApi",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: Cors.DEFAULT_HEADERS,
      },
    });
  }
}
