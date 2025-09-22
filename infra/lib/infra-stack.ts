import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1) Frontend hosting bucket (CORS restricted to dev + CDN)
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedOrigins: [
            'http://localhost:5173',                 // Vite dev
            'http://localhost:3000',                 // CRA dev (if used)
            'https://d2wy8l4c3d4g5g.cloudfront.net', // your current CDN domain
          ],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
    });

    // 2) CloudFront distribution (use S3BucketOrigin with OAC + SPA routing)
    const distribution = new cloudfront.Distribution(this, 'SiteCdn', {
      defaultBehavior: {
        // factory method avoids abstract class error
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // 3) Tiny Lambda for /healthz (with log retention)
    const healthFn = new lambda.Function(this, 'HealthFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/health'),
      logRetention: logs.RetentionDays.TWO_WEEKS, // keep logs tidy
    });

    // 4) API Gateway in front of Lambda
    const api = new apigw.RestApi(this, 'DevApi', {
      deployOptions: { stageName: 'dev' },
    });
    const health = api.root.addResource('healthz');
    health.addMethod('GET', new apigw.LambdaIntegration(healthFn));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'CdnDomain', { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'BucketName', { value: siteBucket.bucketName });

    // Lambda that returns presigned S3 PUT URLs
const uploadFn = new lambda.Function(this, 'UploadFn', {
  runtime: lambda.Runtime.PYTHON_3_12,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/upload_py'),
  environment: {
    BUCKET: siteBucket.bucketName,
  },
});

    // Allow Lambda to generate PUT URLs for this bucket
    siteBucket.grantPut(uploadFn);

    // API route: GET /upload-url
    const upload = api.root.addResource('upload-url');
    upload.addMethod('GET', new apigw.LambdaIntegration(uploadFn));
  }
}
