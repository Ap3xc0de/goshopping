# --- CloudFront Origin Access Identity ---
resource "aws_cloudfront_origin_access_identity" "superadmin" {
  comment = "OAI for goshopping superadmin ${var.environment}"
}

resource "aws_cloudfront_origin_access_identity" "admin" {
  comment = "OAI for goshopping admin ${var.environment}"
}

resource "aws_cloudfront_origin_access_identity" "storefront" {
  comment = "OAI for goshopping storefront ${var.environment}"
}

# --- S3 Bucket Policies for OAI ---
data "aws_iam_policy_document" "superadmin_s3" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${var.superadmin_bucket_arn}/*"]
    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.superadmin.iam_arn]
    }
  }
}

data "aws_iam_policy_document" "admin_s3" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${var.admin_bucket_arn}/*"]
    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.admin.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "superadmin" {
  bucket = var.superadmin_bucket_id
  policy = data.aws_iam_policy_document.superadmin_s3.json
}

resource "aws_s3_bucket_policy" "admin" {
  bucket = var.admin_bucket_id
  policy = data.aws_iam_policy_document.admin_s3.json
}

data "aws_iam_policy_document" "storefront_s3" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${var.storefront_bucket_arn}/*"]
    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.storefront.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "storefront" {
  bucket = var.storefront_bucket_id
  policy = data.aws_iam_policy_document.storefront_s3.json
}

# --- CloudFront Distribution: SuperAdmin ---
resource "aws_cloudfront_distribution" "superadmin" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "Go Shopping SuperAdmin ${var.environment}"
  price_class         = "PriceClass_100"
  aliases             = [var.superadmin_domain_name]

  origin {
    domain_name = var.superadmin_bucket_regional_domain
    origin_id   = "s3-superadmin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.superadmin.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-superadmin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn            = var.certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
    cloudfront_default_certificate = false
  }

  tags = { Environment = var.environment }
}

# --- CloudFront Distribution: Admin ---
resource "aws_cloudfront_distribution" "admin" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "Go Shopping Admin ${var.environment}"
  price_class         = "PriceClass_100"
  aliases             = [var.admin_domain_name]

  origin {
    domain_name = var.admin_bucket_regional_domain
    origin_id   = "s3-admin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.admin.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-admin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn            = var.certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
    cloudfront_default_certificate = false
  }

  tags = { Environment = var.environment }
}

# --- CloudFront Distribution: Storefront ---
resource "aws_cloudfront_distribution" "storefront" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "Go Shopping Storefront ${var.environment}"
  price_class         = "PriceClass_100"
  aliases             = [var.storefront_domain_name]

  origin {
    domain_name = var.storefront_bucket_regional_domain
    origin_id   = "s3-storefront"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.storefront.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-storefront"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn            = var.certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
    cloudfront_default_certificate = false
  }

  tags = { Environment = var.environment }
}

# --- CloudFront Distribution: CDN Assets ---
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  comment             = "Go Shopping CDN ${var.environment}"
  price_class         = "PriceClass_100"
  aliases             = [var.cdn_domain_name]

  origin {
    domain_name = var.assets_bucket_regional_domain
    origin_id   = "s3-assets"
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-assets"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn            = var.certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
    cloudfront_default_certificate = false
  }

  tags = { Environment = var.environment }
}
