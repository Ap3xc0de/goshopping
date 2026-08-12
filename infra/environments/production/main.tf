terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "goshopping-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "goshopping-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
}

provider "cloudflare" {}

data "cloudflare_zone" "primary" {
  # Cloudflare provider v5: filter is an attribute, not a block.
  filter = {
    name = var.cloudflare_zone_name
  }
}

locals {
  environment_prefix     = var.environment == "production" ? "" : "${var.environment}."
  api_domain_name        = "api.${local.environment_prefix}${var.base_domain}"
  admin_domain_name      = "admin.${local.environment_prefix}${var.base_domain}"
  superadmin_domain_name = "superadmin.${local.environment_prefix}${var.base_domain}"
  storefront_domain_name = "app.${local.environment_prefix}${var.base_domain}"
  cdn_domain_name        = "cdn.${local.environment_prefix}${var.base_domain}"
}

resource "aws_acm_certificate" "api" {
  domain_name       = local.api_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "cloudflare_dns_record" "api_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => dvo
  }

  zone_id = data.cloudflare_zone.primary.zone_id
  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  content = each.value.resource_record_value
  ttl     = 1
  proxied = false
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn = aws_acm_certificate.api.arn
  depends_on      = [cloudflare_dns_record.api_validation]
}

resource "aws_acm_certificate" "frontend" {
  domain_name = local.admin_domain_name
  subject_alternative_names = [
    local.superadmin_domain_name,
    local.storefront_domain_name,
    local.cdn_domain_name,
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "cloudflare_dns_record" "frontend_validation" {
  for_each = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => dvo
  }

  zone_id = data.cloudflare_zone.primary.zone_id
  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  content = each.value.resource_record_value
  ttl     = 1
  proxied = false
}

resource "aws_acm_certificate_validation" "frontend" {
  certificate_arn = aws_acm_certificate.frontend.arn
  depends_on      = [cloudflare_dns_record.frontend_validation]
}

module "vpc" {
  source = "../../modules/vpc"

  environment          = "production"
  vpc_cidr             = "10.1.0.0/16"
  public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
  private_subnet_cidrs = ["10.1.11.0/24", "10.1.12.0/24"]
  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b"]
}

module "ecr" {
  source      = "../../modules/ecr"
  environment = "production"
}

module "rds" {
  source = "../../modules/rds"

  environment                = "production"
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.ecs.ecs_tasks_security_group_id]
  db_password                = var.db_password
  instance_class             = "db.t3.small"
  multi_az                   = true
  deletion_protection        = true
}

module "sqs" {
  source      = "../../modules/sqs"
  environment = "production"
}

module "secrets" {
  source          = "../../modules/secrets"
  environment     = "production"
  jwt_signing_key = var.jwt_signing_key
}

module "ecs" {
  source = "../../modules/ecs"

  environment        = "production"
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  ecr_urls           = module.ecr.repository_urls
  task_cpu           = 512
  task_memory        = 1024
  desired_count      = 2
  certificate_arn    = aws_acm_certificate_validation.api.certificate_arn
  api_domain_name    = local.api_domain_name
}

module "ssm" {
  source = "../../modules/ssm"

  environment      = "production"
  db_host          = module.rds.db_host
  core_api_url     = "https://${local.api_domain_name}"
  integrations_url = "http://${module.ecs.alb_dns_name}:3001"
  sqs_queue_urls   = module.sqs.queue_urls
}

module "s3" {
  source      = "../../modules/s3"
  environment = "production"
}

module "cdn" {
  source = "../../modules/cdn"

  environment                       = "production"
  assets_bucket_id                  = module.s3.assets_bucket_name
  assets_bucket_arn                 = module.s3.assets_bucket_arn
  assets_bucket_regional_domain     = "${module.s3.assets_bucket_name}.s3.${var.aws_region}.amazonaws.com"
  superadmin_bucket_id              = module.s3.superadmin_bucket_id
  superadmin_bucket_arn             = module.s3.superadmin_bucket_arn
  superadmin_bucket_regional_domain = "${module.s3.superadmin_bucket_id}.s3.${var.aws_region}.amazonaws.com"
  admin_bucket_id                   = module.s3.admin_bucket_id
  admin_bucket_arn                  = module.s3.admin_bucket_arn
  admin_bucket_regional_domain      = "${module.s3.admin_bucket_id}.s3.${var.aws_region}.amazonaws.com"
  storefront_bucket_id              = module.s3.storefront_bucket_id
  storefront_bucket_arn             = module.s3.storefront_bucket_arn
  storefront_bucket_regional_domain = "${module.s3.storefront_bucket_id}.s3.${var.aws_region}.amazonaws.com"
  certificate_arn                   = aws_acm_certificate_validation.frontend.certificate_arn
  cdn_domain_name                   = local.cdn_domain_name
  superadmin_domain_name            = local.superadmin_domain_name
  admin_domain_name                 = local.admin_domain_name
  storefront_domain_name            = local.storefront_domain_name
}

resource "cloudflare_dns_record" "api" {
  zone_id = data.cloudflare_zone.primary.zone_id
  name    = replace(local.api_domain_name, ".${var.cloudflare_zone_name}", "")
  type    = "CNAME"
  content = module.ecs.alb_dns_name
  ttl     = 1
  proxied = false
}

resource "cloudflare_dns_record" "admin" {
  zone_id = data.cloudflare_zone.primary.zone_id
  name    = replace(local.admin_domain_name, ".${var.cloudflare_zone_name}", "")
  type    = "CNAME"
  content = module.cdn.admin_domain_name
  ttl     = 1
  proxied = false
}

resource "cloudflare_dns_record" "superadmin" {
  zone_id = data.cloudflare_zone.primary.zone_id
  name    = replace(local.superadmin_domain_name, ".${var.cloudflare_zone_name}", "")
  type    = "CNAME"
  content = module.cdn.superadmin_domain_name
  ttl     = 1
  proxied = false
}

resource "cloudflare_dns_record" "storefront" {
  zone_id = data.cloudflare_zone.primary.zone_id
  name    = replace(local.storefront_domain_name, ".${var.cloudflare_zone_name}", "")
  type    = "CNAME"
  content = module.cdn.storefront_domain_name
  ttl     = 1
  proxied = false
}

resource "cloudflare_dns_record" "cdn" {
  zone_id = data.cloudflare_zone.primary.zone_id
  name    = replace(local.cdn_domain_name, ".${var.cloudflare_zone_name}", "")
  type    = "CNAME"
  content = module.cdn.cdn_domain_name
  ttl     = 1
  proxied = false
}

module "oidc" {
  source = "../../modules/oidc"

  environment          = "production"
  github_org           = var.github_org
  github_repo          = var.github_repo
  create_oidc_provider = false # provider created by staging; look up by URL
}
