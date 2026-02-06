#!/usr/bin/env python3
"""
Deploy thumbnail generator Lambda to LocalStack.

Usage:
    python scripts/deploy_lambda.py

Run from backend container:
    docker-compose exec backend python scripts/deploy_lambda.py
"""
import json
import os
import sys
import zipfile
from io import BytesIO
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

# Configuration
LOCALSTACK_URL = os.environ.get("S3_ENDPOINT_URL", "http://localstack:4566")
AWS_REGION = os.environ.get("AWS_REGION", "eu-north-1")
BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "toolsharer-icons")
LAMBDA_NAME = "thumbnail-generator"


def get_client(service: str):
    """Create a boto3 client for LocalStack."""
    return boto3.client(
        service,
        endpoint_url=LOCALSTACK_URL,
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "test"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "test"),
        region_name=AWS_REGION,
    )


def create_zip_package() -> bytes:
    """Create a ZIP package from the Lambda handler."""
    # Find Lambda directory
    if Path("/lambdas/thumbnail_generator").exists():
        lambda_dir = Path("/lambdas/thumbnail_generator")
    else:
        lambda_dir = Path(__file__).parent.parent / "lambdas" / "thumbnail_generator"

    handler_path = lambda_dir / "handler.py"
    if not handler_path.exists():
        raise FileNotFoundError(f"Lambda handler not found: {handler_path}")

    # Create ZIP in memory
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(handler_path, "handler.py")

    zip_buffer.seek(0)
    return zip_buffer.read()


def deploy_lambda():
    """Deploy the Lambda function to LocalStack."""
    print("=== Deploying Thumbnail Generator Lambda ===")
    print(f"LocalStack URL: {LOCALSTACK_URL}")
    print(f"Region: {AWS_REGION}")
    print(f"Bucket: {BUCKET_NAME}")
    print()

    lambda_client = get_client("lambda")
    s3_client = get_client("s3")

    # Step 1: Create ZIP package
    print("1. Creating Lambda deployment package...")
    zip_bytes = create_zip_package()
    print(f"   Package size: {len(zip_bytes)} bytes")

    # Step 2: Create or update Lambda function
    print()
    print("2. Creating/updating Lambda function...")

    lambda_config = {
        "FunctionName": LAMBDA_NAME,
        "Runtime": "python3.11",
        "Handler": "handler.handler",
        "Role": "arn:aws:iam::000000000000:role/lambda-role",
        "Timeout": 30,
        "MemorySize": 128,
        "Environment": {
            "Variables": {
                # Use 127.0.0.1 for LocalStack local executor
                "S3_ENDPOINT_URL": "http://127.0.0.1:4566",
                "AWS_ACCESS_KEY_ID": "test",
                "AWS_SECRET_ACCESS_KEY": "test",
                "AWS_REGION": AWS_REGION,
            }
        },
    }

    try:
        # Check if function exists
        lambda_client.get_function(FunctionName=LAMBDA_NAME)
        print("   Function exists, updating code...")
        lambda_client.update_function_code(
            FunctionName=LAMBDA_NAME,
            ZipFile=zip_bytes,
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            print("   Creating new function...")
            lambda_client.create_function(
                **lambda_config,
                Code={"ZipFile": zip_bytes},
            )
        else:
            raise

    print(f"   Lambda function ready: {LAMBDA_NAME}")

    # Step 3: Ensure S3 bucket exists
    print()
    print("3. Ensuring S3 bucket exists...")
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
        print(f"   Bucket already exists: {BUCKET_NAME}")
    except ClientError:
        print(f"   Creating bucket: {BUCKET_NAME}")
        s3_client.create_bucket(
            Bucket=BUCKET_NAME,
            CreateBucketConfiguration={"LocationConstraint": AWS_REGION},
        )

    # Step 4: Add Lambda permission for S3
    print()
    print("4. Adding S3 invoke permission...")
    try:
        lambda_client.add_permission(
            FunctionName=LAMBDA_NAME,
            StatementId="s3-trigger",
            Action="lambda:InvokeFunction",
            Principal="s3.amazonaws.com",
            SourceArn=f"arn:aws:s3:::{BUCKET_NAME}",
        )
        print("   Permission added")
    except ClientError as e:
        if "ResourceConflictException" in str(type(e)):
            print("   Permission already exists (OK)")
        else:
            # LocalStack may return different error, ignore
            print(f"   Permission setup: {e}")

    # Step 5: Configure S3 bucket notification (optional - can fail in LocalStack Community)
    print()
    print("5. Configuring S3 trigger...")

    # Get Lambda ARN
    lambda_info = lambda_client.get_function(FunctionName=LAMBDA_NAME)
    lambda_arn = lambda_info["Configuration"]["FunctionArn"]
    print(f"   Lambda ARN: {lambda_arn}")

    notification_config = {
        "LambdaFunctionConfigurations": [
            {
                "Id": "ThumbnailGeneratorTrigger",
                "LambdaFunctionArn": lambda_arn,
                "Events": ["s3:ObjectCreated:*"],
                "Filter": {
                    "Key": {
                        "FilterRules": [
                            {"Name": "prefix", "Value": "icons/"}
                        ]
                    }
                },
            }
        ]
    }

    try:
        s3_client.put_bucket_notification_configuration(
            Bucket=BUCKET_NAME,
            NotificationConfiguration=notification_config,
        )
        print("   S3 trigger configured for prefix: icons/")
    except ClientError as e:
        print(f"   WARNING: S3 trigger setup failed (LocalStack limitation): {e}")
        print("   Lambda can still be invoked manually - see instructions below")

    # Step 6: Verify deployment
    print()
    print("6. Verifying deployment...")

    functions = lambda_client.list_functions()
    print("   Lambda functions:")
    for fn in functions.get("Functions", []):
        print(f"     - {fn['FunctionName']}")

    notification = s3_client.get_bucket_notification_configuration(Bucket=BUCKET_NAME)
    print()
    print("   S3 notification config:")
    print(f"     {json.dumps(notification.get('LambdaFunctionConfigurations', []), indent=2)}")

    # Step 7: Test Lambda with manual invocation
    print()
    print("7. Testing Lambda with manual invocation...")

    test_event = {
        "Records": [
            {
                "s3": {
                    "bucket": {"name": BUCKET_NAME},
                    "object": {"key": "icons/drill.svg"}
                }
            }
        ]
    }

    try:
        response = lambda_client.invoke(
            FunctionName=LAMBDA_NAME,
            InvocationType="RequestResponse",
            Payload=json.dumps(test_event),
        )
        payload = json.loads(response["Payload"].read())
        print(f"   Lambda response: {payload}")

        # Check if thumbnail was created
        try:
            s3_client.head_object(Bucket=BUCKET_NAME, Key="thumbnails/drill.svg")
            print("   Thumbnail created: thumbnails/drill.svg")
        except ClientError:
            print("   Note: Thumbnail not found (icon may not exist yet)")
    except Exception as e:
        print(f"   Lambda test invocation: {e}")

    print()
    print("=== Deployment Complete ===")
    print()
    print("The Lambda function is ready. To generate thumbnails:")
    print()
    print("Option 1: Upload icons then invoke Lambda manually")
    print("  docker-compose exec backend python scripts/upload_icons_to_s3.py")
    print("  docker-compose exec backend python scripts/invoke_thumbnail_lambda.py")
    print()
    print("Option 2: Check thumbnails")
    print("  curl -I http://localhost:4566/toolsharer-icons/thumbnails/drill.svg")

    return True


if __name__ == "__main__":
    try:
        success = deploy_lambda()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
