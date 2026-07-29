#!/bin/bash
# Creates required S3 buckets in LocalStack on startup
set -e

BUCKET="goshopping-assets-dev"
echo "==> Creating ${BUCKET} bucket..."
awslocal s3 mb s3://${BUCKET} --region us-east-1 2>/dev/null || echo "Bucket already exists"
awslocal s3api put-bucket-acl --bucket ${BUCKET} --acl public-read

# CORS so browsers can PUT (upload) and GET (display) images
awslocal s3api put-bucket-cors --bucket ${BUCKET} --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET","PUT","HEAD","POST","DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}'
echo "==> ${BUCKET} ready"
