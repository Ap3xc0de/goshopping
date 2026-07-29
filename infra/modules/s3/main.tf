data "aws_canonical_user_id" "current" {}

# --- S3 Terraform State Bucket ---
resource "aws_s3_bucket" "terraform_state" {
  bucket = "goshopping-terraform-state"
  tags   = { Name = "goshopping-terraform-state" }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket                  = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- DynamoDB for Terraform State Locking ---
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "goshopping-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = { Name = "goshopping-terraform-locks" }
}

# --- S3 Assets Bucket (public static assets) ---
resource "aws_s3_bucket" "assets" {
  bucket = "goshopping-assets-${var.environment}"
  tags   = { Name = "goshopping-assets-${var.environment}" }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.assets.arn}/*"
    }]
  })
  depends_on = [aws_s3_bucket_public_access_block.assets]
}

# --- S3 Frontend Buckets (served via CloudFront) ---
resource "aws_s3_bucket" "superadmin" {
  bucket = "goshopping-superadmin-${var.environment}"
  tags   = { Name = "goshopping-superadmin-${var.environment}" }
}

resource "aws_s3_bucket" "admin" {
  bucket = "goshopping-admin-${var.environment}"
  tags   = { Name = "goshopping-admin-${var.environment}" }
}

resource "aws_s3_bucket" "storefront" {
  bucket = "goshopping-storefront-${var.environment}"
  tags   = { Name = "goshopping-storefront-${var.environment}" }
}

resource "aws_s3_bucket_public_access_block" "superadmin" {
  bucket                  = aws_s3_bucket.superadmin.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "admin" {
  bucket                  = aws_s3_bucket.admin.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "storefront" {
  bucket                  = aws_s3_bucket.storefront.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
