import os
import uuid
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import boto3
from botocore.config import Config

AWS_REGION = os.getenv("AWS_REGION", "eu-north-1")
S3_BUCKET = os.getenv("S3_BUCKET", "")
PRESIGN_EXPIRES = int(os.getenv("PRESIGN_EXPIRES", "300"))
KEY_PREFIX = os.getenv("KEY_PREFIX", "uploads/")
ENFORCE_SSE = os.getenv("ENFORCE_SSE", "false").lower() in {"1","true","yes"}

if not S3_BUCKET:
    raise RuntimeError("S3_BUCKET env var must be set")

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/api/s3/presign")
def presign(
    filename: str = Query(..., min_length=1),
    contentType: str = Query("application/octet-stream"),
    sizeBytes: int | None = None,
):
    safe_name = filename.replace("\\","/").split("/")[-1]
    key = f"{KEY_PREFIX}{uuid.uuid4()}-{safe_name}"

    params = {"Bucket": S3_BUCKET, "Key": key, "ContentType": contentType}
    headers: dict[str,str] = {}
    if ENFORCE_SSE:
        params["ServerSideEncryption"] = "AES256"
        headers["x-amz-server-side-encryption"] = "AES256"

    try:
        url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params=params,
            ExpiresIn=PRESIGN_EXPIRES,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to presign: {e}")

    return {"url": url, "headers": headers or None}
