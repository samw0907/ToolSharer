#!/bin/bash
# Deploy thumbnail generator Lambda to LocalStack
#
# Usage: ./scripts/deploy_lambda.sh
#
# Prerequisites:
# - LocalStack running with lambda,s3 services
# - AWS CLI installed (or run inside backend container)

set -e

LOCALSTACK_URL="${LOCALSTACK_URL:-http://localhost:4566}"
AWS_REGION="${AWS_REGION:-eu-north-1}"
BUCKET_NAME="${BUCKET_NAME:-toolsharer-icons}"
LAMBDA_NAME="thumbnail-generator"
LAMBDA_DIR="/lambdas/thumbnail_generator"

# AWS CLI alias for LocalStack
aws_local() {
    aws --endpoint-url="$LOCALSTACK_URL" --region="$AWS_REGION" "$@"
}

echo "=== Deploying Thumbnail Generator Lambda ==="
echo "LocalStack URL: $LOCALSTACK_URL"
echo "Region: $AWS_REGION"
echo "Bucket: $BUCKET_NAME"
echo ""

# Step 1: Create ZIP package from Lambda code
echo "1. Creating Lambda deployment package..."
cd "$LAMBDA_DIR"
zip -r /tmp/lambda.zip handler.py
echo "   Created /tmp/lambda.zip"

# Step 2: Create or update Lambda function
echo ""
echo "2. Creating/updating Lambda function..."

# Check if function exists
if aws_local lambda get-function --function-name "$LAMBDA_NAME" 2>/dev/null; then
    echo "   Function exists, updating code..."
    aws_local lambda update-function-code \
        --function-name "$LAMBDA_NAME" \
        --zip-file fileb:///tmp/lambda.zip
else
    echo "   Creating new function..."
    aws_local lambda create-function \
        --function-name "$LAMBDA_NAME" \
        --runtime python3.11 \
        --handler handler.handler \
        --zip-file fileb:///tmp/lambda.zip \
        --role arn:aws:iam::000000000000:role/lambda-role \
        --timeout 30 \
        --memory-size 128 \
        --environment "Variables={S3_ENDPOINT_URL=http://localhost:4566,AWS_ACCESS_KEY_ID=test,AWS_SECRET_ACCESS_KEY=test,AWS_REGION=$AWS_REGION}"
fi

echo "   Lambda function ready: $LAMBDA_NAME"

# Step 3: Ensure S3 bucket exists
echo ""
echo "3. Ensuring S3 bucket exists..."
if aws_local s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "   Bucket already exists: $BUCKET_NAME"
else
    echo "   Creating bucket: $BUCKET_NAME"
    aws_local s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION"
fi

# Step 4: Add Lambda permission for S3 to invoke it
echo ""
echo "4. Adding S3 invoke permission..."
aws_local lambda add-permission \
    --function-name "$LAMBDA_NAME" \
    --statement-id s3-trigger \
    --action lambda:InvokeFunction \
    --principal s3.amazonaws.com \
    --source-arn "arn:aws:s3:::$BUCKET_NAME" \
    2>/dev/null || echo "   Permission already exists (OK)"

# Step 5: Configure S3 bucket notification
echo ""
echo "5. Configuring S3 trigger..."

# Get Lambda ARN
LAMBDA_ARN=$(aws_local lambda get-function --function-name "$LAMBDA_NAME" --query 'Configuration.FunctionArn' --output text)
echo "   Lambda ARN: $LAMBDA_ARN"

# Create notification configuration
cat > /tmp/s3-notification.json << EOF
{
    "LambdaFunctionConfigurations": [
        {
            "Id": "ThumbnailGeneratorTrigger",
            "LambdaFunctionArn": "$LAMBDA_ARN",
            "Events": ["s3:ObjectCreated:*"],
            "Filter": {
                "Key": {
                    "FilterRules": [
                        {
                            "Name": "prefix",
                            "Value": "icons/"
                        }
                    ]
                }
            }
        }
    ]
}
EOF

aws_local s3api put-bucket-notification-configuration \
    --bucket "$BUCKET_NAME" \
    --notification-configuration file:///tmp/s3-notification.json

echo "   S3 trigger configured for prefix: icons/"

# Step 6: Verify deployment
echo ""
echo "6. Verifying deployment..."
echo "   Lambda functions:"
aws_local lambda list-functions --query 'Functions[].FunctionName' --output text

echo ""
echo "   S3 bucket notification:"
aws_local s3api get-bucket-notification-configuration --bucket "$BUCKET_NAME"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "To test, upload an icon to S3:"
echo "  aws --endpoint-url=$LOCALSTACK_URL s3 cp test.svg s3://$BUCKET_NAME/icons/test.svg"
echo ""
echo "Then check for thumbnail:"
echo "  aws --endpoint-url=$LOCALSTACK_URL s3 ls s3://$BUCKET_NAME/thumbnails/"
