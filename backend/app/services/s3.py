# app/services/s3.py
"""
S3 service for managing tool icon storage.
Supports both real AWS S3 and LocalStack for local development.
"""
import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_s3_client = None


def get_s3_client():
    """
    Get or create a singleton S3 client.
    Configures endpoint URL for LocalStack if S3_ENDPOINT_URL is set.
    """
    global _s3_client
    if _s3_client is None:
        settings = get_settings()
        client_kwargs = {
            "region_name": settings.AWS_REGION,
        }

        # Use explicit credentials if provided
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

        # Use custom endpoint for LocalStack
        if settings.S3_ENDPOINT_URL:
            client_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

        _s3_client = boto3.client("s3", **client_kwargs)

    return _s3_client


def ensure_bucket_exists() -> bool:
    """
    Ensure the S3 bucket exists, creating it if necessary.
    Returns True if bucket exists or was created, False on error.
    """
    settings = get_settings()
    bucket_name = settings.S3_BUCKET_NAME
    client = get_s3_client()

    try:
        client.head_bucket(Bucket=bucket_name)
        logger.info(f"S3 bucket '{bucket_name}' already exists")
        return True
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code in ("404", "NoSuchBucket"):
            try:
                # Create bucket with region configuration
                if settings.AWS_REGION == "us-east-1":
                    client.create_bucket(Bucket=bucket_name)
                else:
                    client.create_bucket(
                        Bucket=bucket_name,
                        CreateBucketConfiguration={
                            "LocationConstraint": settings.AWS_REGION
                        }
                    )
                logger.info(f"Created S3 bucket '{bucket_name}'")
                return True
            except ClientError as create_error:
                logger.error(f"Failed to create bucket: {create_error}")
                return False
        else:
            logger.error(f"Error checking bucket: {e}")
            return False


def upload_file(
    file_content: bytes,
    s3_key: str,
    content_type: str = "image/svg+xml"
) -> bool:
    """
    Upload file content to S3.

    Args:
        file_content: Raw bytes of the file
        s3_key: The S3 object key (path within bucket)
        content_type: MIME type of the file

    Returns:
        True if upload succeeded, False otherwise
    """
    settings = get_settings()
    client = get_s3_client()

    try:
        client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type,
        )
        logger.info(f"Uploaded '{s3_key}' to S3")
        return True
    except ClientError as e:
        logger.error(f"Failed to upload '{s3_key}': {e}")
        return False


def get_file_url(s3_key: str, public: bool = True) -> str:
    """
    Get the URL for an S3 object.

    Args:
        s3_key: The S3 object key
        public: If True, use the public endpoint URL for frontend access.
                If False, use the internal endpoint URL.

    For LocalStack:
        - public=True returns http://localhost:4566/... (for frontend)
        - public=False returns http://localstack:4566/... (for backend)
    For real S3, returns the standard S3 URL.
    """
    settings = get_settings()

    if settings.S3_PUBLIC_ENDPOINT_URL and public:
        # Use public endpoint for frontend access (e.g., localhost:4566)
        return f"{settings.S3_PUBLIC_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{s3_key}"
    elif settings.S3_ENDPOINT_URL:
        # LocalStack internal URL format
        return f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{s3_key}"
    else:
        # Standard S3 URL format
        return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"


def generate_presigned_url(
    s3_key: str,
    expiration: int = 3600,
    for_upload: bool = False
) -> Optional[str]:
    """
    Generate a presigned URL for S3 object access or upload.

    Args:
        s3_key: The S3 object key
        expiration: URL expiration time in seconds (default 1 hour)
        for_upload: If True, generate URL for PUT (upload); otherwise GET (download)

    Returns:
        Presigned URL string, or None on error
    """
    settings = get_settings()
    client = get_s3_client()

    try:
        method = "put_object" if for_upload else "get_object"
        url = client.generate_presigned_url(
            method,
            Params={
                "Bucket": settings.S3_BUCKET_NAME,
                "Key": s3_key,
            },
            ExpiresIn=expiration,
        )
        return url
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL for '{s3_key}': {e}")
        return None


def delete_file(s3_key: str) -> bool:
    """
    Delete a file from S3.

    Args:
        s3_key: The S3 object key to delete

    Returns:
        True if deletion succeeded, False otherwise
    """
    settings = get_settings()
    client = get_s3_client()

    try:
        client.delete_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
        )
        logger.info(f"Deleted '{s3_key}' from S3")
        return True
    except ClientError as e:
        logger.error(f"Failed to delete '{s3_key}': {e}")
        return False


def list_files(prefix: str = "") -> list[str]:
    """
    List files in the S3 bucket with optional prefix filter.

    Args:
        prefix: Filter results to keys starting with this prefix

    Returns:
        List of S3 keys matching the prefix
    """
    settings = get_settings()
    client = get_s3_client()

    try:
        response = client.list_objects_v2(
            Bucket=settings.S3_BUCKET_NAME,
            Prefix=prefix,
        )

        if "Contents" not in response:
            return []

        return [obj["Key"] for obj in response["Contents"]]
    except ClientError as e:
        logger.error(f"Failed to list files with prefix '{prefix}': {e}")
        return []


def file_exists(s3_key: str) -> bool:
    """
    Check if a file exists in S3.

    Args:
        s3_key: The S3 object key to check

    Returns:
        True if file exists, False otherwise
    """
    settings = get_settings()
    client = get_s3_client()

    try:
        client.head_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
        )
        return True
    except ClientError:
        return False
