variable "aws_region"      { type = string; default = "us-east-1" }
variable "base_domain"     { type = string; default = "vettacode.com" }
variable "cloudflare_zone_name" { type = string; default = "vettacode.com" }
variable "db_password"     { type = string; sensitive = true }
variable "jwt_signing_key" { type = string; sensitive = true }
variable "github_org"      { type = string }
variable "github_repo"     { type = string }
