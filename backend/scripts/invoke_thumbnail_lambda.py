#!/usr/bin/env python3
"""
Manually invoke the thumbnail generator Lambda for all icons in S3.

Usage:
    docker-compose exec backend python scripts/invoke_thumbnail_lambda.py
"""
import json
import os
import sys

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


def main():
    print("=== Invoking Thumbnail Generator Lambda ===")
    print()

    s3 = get_client("s3")
    lambda_client = get_client("lambda")

    # List all icons in S3
    print("Finding icons in S3...")
    try:
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix="icons/")
        icons = [obj["Key"] for obj in response.get("Contents", []) if obj["Key"].endswith(".svg")]
    except ClientError as e:
        print(f"ERROR: Failed to list icons: {e}")
        return False

    if not icons:
        print("No icons found. Run upload_icons_to_s3.py first.")
        return False

    print(f"Found {len(icons)} icons")
    print()

    # Invoke Lambda for each icon
    print("Invoking Lambda...")
    for icon_key in icons:
        event = {
            "Records": [
                {
                    "s3": {
                        "bucket": {"name": BUCKET_NAME},
                        "object": {"key": icon_key}
                    }
                }
            ]
        }

        try:
            response = lambda_client.invoke(
                FunctionName=LAMBDA_NAME,
                InvocationType="RequestResponse",
                Payload=json.dumps(event),
            )
            payload = json.loads(response["Payload"].read())
            status = response.get("StatusCode", "?")
            print(f"  {icon_key} -> {status}")
        except ClientError as e:
            print(f"  {icon_key} -> ERROR: {e}")

    # List thumbnails
    print()
    print("Thumbnails in S3:")
    try:
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix="thumbnails/")
        thumbnails = [obj["Key"] for obj in response.get("Contents", [])]
        for thumb in thumbnails:
            print(f"  - {thumb}")
        print()
        print(f"Total: {len(thumbnails)} thumbnails")
    except ClientError:
        print("  (none)")

    print()
    print("=== Done ===")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
