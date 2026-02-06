"""
Lambda function: Thumbnail Generator

Triggered by S3 ObjectCreated events on the icons/ prefix.
Demonstrates the S3 → Lambda pipeline pattern.

For this portfolio project with SVG icons, we "process" by:
1. Reading the uploaded icon
2. Creating a copy in the thumbnails/ prefix
3. Logging the processing for demonstration

In a real app with user image uploads, this would:
- Validate image format
- Resize to thumbnail dimensions
- Apply compression
- Run content moderation (AWS Rekognition)
"""
import json
import logging
import os
import urllib.parse

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# S3 client - uses environment variables for LocalStack endpoint
def get_s3_client():
    # For LocalStack Lambda execution:
    # - LOCALSTACK_HOSTNAME is set when using docker executor
    # - When using local executor, Lambda runs in LocalStack process, use 127.0.0.1
    localstack_host = os.environ.get("LOCALSTACK_HOSTNAME")
    if localstack_host:
        endpoint_url = f"http://{localstack_host}:4566"
    else:
        # Local executor - Lambda runs inside LocalStack, use 127.0.0.1
        endpoint_url = os.environ.get("S3_ENDPOINT_URL", "http://127.0.0.1:4566")

    logger.info(f"S3 endpoint: {endpoint_url}")

    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "test"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "test"),
        region_name=os.environ.get("AWS_REGION", "eu-north-1"),
    )


def handler(event, context):
    """
    Lambda handler for S3 ObjectCreated events.

    Event structure:
    {
        "Records": [
            {
                "s3": {
                    "bucket": {"name": "toolsharer-icons"},
                    "object": {"key": "icons/drill.svg"}
                }
            }
        ]
    }
    """
    logger.info(f"Received event: {json.dumps(event)}")

    s3 = get_s3_client()
    processed_count = 0
    error_count = 0

    for record in event.get("Records", []):
        try:
            # Extract bucket and key from event
            bucket = record["s3"]["bucket"]["name"]
            key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

            logger.info(f"Processing: s3://{bucket}/{key}")

            # Skip if not in icons/ prefix or already processed
            if not key.startswith("icons/"):
                logger.info(f"Skipping non-icon file: {key}")
                continue

            if key.startswith("thumbnails/"):
                logger.info(f"Skipping already processed file: {key}")
                continue

            # Extract icon name (e.g., "icons/drill.svg" -> "drill")
            icon_name = key.replace("icons/", "").replace(".svg", "")

            # Read the original icon
            response = s3.get_object(Bucket=bucket, Key=key)
            icon_content = response["Body"].read()
            content_type = response.get("ContentType", "image/svg+xml")

            logger.info(f"Read icon: {icon_name} ({len(icon_content)} bytes)")

            # Create thumbnail path
            thumbnail_key = f"thumbnails/{icon_name}.svg"

            # Upload to thumbnails/ prefix
            # In a real app, this would be a resized/processed version
            s3.put_object(
                Bucket=bucket,
                Key=thumbnail_key,
                Body=icon_content,
                ContentType=content_type,
                Metadata={
                    "original-key": key,
                    "processed-by": "thumbnail-generator-lambda",
                }
            )

            logger.info(f"Created thumbnail: s3://{bucket}/{thumbnail_key}")
            processed_count += 1

        except ClientError as e:
            logger.error(f"S3 error processing {record}: {e}")
            error_count += 1
        except Exception as e:
            logger.error(f"Error processing {record}: {e}")
            error_count += 1

    result = {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Thumbnail generation complete",
            "processed": processed_count,
            "errors": error_count,
        })
    }

    logger.info(f"Result: {result}")
    return result
