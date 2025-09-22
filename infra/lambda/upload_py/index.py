# infra/lambda/upload_py/index.py
import json
import os
import time
import random
import string
import urllib.parse
import boto3

s3 = boto3.client('s3')
BUCKET = os.environ.get('BUCKET', '')
DEFAULT_CONTENT_TYPE = 'application/octet-stream'

def _rand(n=6):
    return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(n))

def handler(event, context):
    try:
        qs = event.get('queryStringParameters') or {}
        key = qs.get('key') or f"uploads/{int(time.time() * 1000)}-{_rand()}"
        content_type = qs.get('contentType') or DEFAULT_CONTENT_TYPE

        params = {
            'Bucket': BUCKET,
            'Key': key,
            'ContentType': content_type,
        }

        url = s3.generate_presigned_url(
            ClientMethod='put_object',
            Params=params,
            ExpiresIn=300,  # seconds
        )

        return {
            'statusCode': 200,
            'headers': {'content-type': 'application/json'},
            'body': json.dumps({'url': url, 'key': key, 'bucket': BUCKET}),
        }
    except Exception as e:
        print(f"ERROR: {e}")
        return {'statusCode': 500, 'body': 'error generating url'}
