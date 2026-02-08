# app/services/email.py
"""
SES email service for sending notifications.
Supports both real AWS SES and LocalStack for local development.
"""
import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_ses_client = None


def get_ses_client():
    """
    Get or create a singleton SES client.
    Configures endpoint URL for LocalStack if SES_ENDPOINT_URL is set.
    """
    global _ses_client
    if _ses_client is None:
        settings = get_settings()
        client_kwargs = {
            "region_name": settings.AWS_REGION,
        }

        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

        if settings.SES_ENDPOINT_URL:
            client_kwargs["endpoint_url"] = settings.SES_ENDPOINT_URL

        _ses_client = boto3.client("ses", **client_kwargs)

    return _ses_client


def verify_sender_email() -> bool:
    """
    Verify the sender email address in SES.
    Required for SES sandbox mode (both LocalStack and real AWS).
    LocalStack auto-verifies, but calling this keeps the code consistent.

    Returns:
        True if verification request succeeded, False otherwise.
    """
    settings = get_settings()
    client = get_ses_client()

    try:
        client.verify_email_identity(EmailAddress=settings.SES_SENDER_EMAIL)
        logger.info(f"SES verification requested for '{settings.SES_SENDER_EMAIL}'")
        return True
    except ClientError as e:
        logger.error(f"Failed to verify sender email: {e}")
        return False


def send_email(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
) -> bool:
    """
    Send an email via SES.

    Args:
        to_email: Recipient email address.
        subject: Email subject line.
        body_text: Plain text body.
        body_html: Optional HTML body. If not provided, only plain text is sent.

    Returns:
        True if email was sent successfully, False otherwise.
    """
    settings = get_settings()
    client = get_ses_client()

    body = {"Text": {"Data": body_text, "Charset": "UTF-8"}}
    if body_html:
        body["Html"] = {"Data": body_html, "Charset": "UTF-8"}

    try:
        response = client.send_email(
            Source=settings.SES_SENDER_EMAIL,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": body,
            },
        )
        message_id = response.get("MessageId", "unknown")
        logger.info(f"Email sent to '{to_email}' (MessageId: {message_id})")
        return True
    except ClientError as e:
        logger.error(f"Failed to send email to '{to_email}': {e}")
        return False
