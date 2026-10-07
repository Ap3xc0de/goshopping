variable "aws_region"     { type = string; default = "us-east-1" }
variable "base_domain"    { type = string; default = "vettacode.com" }
variable "cloudflare_zone_name" { type = string; default = "vettacode.com" }
variable "db_password"    { type = string; sensitive = true }
variable "jwt_signing_key" { type = string; sensitive = true }
variable "github_org"     { type = string }
variable "github_repo"    { type = string }

# Shopper auth (Cognito). Social providers are off until their credentials exist;
# supply credentials via TF_VAR_ env vars or CI secrets, never in tfvars.
variable "cognito_domain_prefix"  { type = string; default = "goshopping-staging" }
variable "cognito_callback_urls"  { type = list(string); default = ["goshopping://auth/callback"] }
variable "cognito_logout_urls"    { type = list(string); default = ["goshopping://auth/signout"] }

variable "enable_google_login"   { type = bool; default = false }
variable "google_client_id"      { type = string; default = null; sensitive = true }
variable "google_client_secret"  { type = string; default = null; sensitive = true }

variable "enable_facebook_login" { type = bool; default = false }
variable "facebook_app_id"       { type = string; default = null; sensitive = true }
variable "facebook_app_secret"   { type = string; default = null; sensitive = true }

variable "enable_apple_login"    { type = bool; default = false }
variable "apple_services_id"     { type = string; default = null; sensitive = true }
variable "apple_team_id"         { type = string; default = null; sensitive = true }
variable "apple_key_id"          { type = string; default = null; sensitive = true }
variable "apple_private_key"     { type = string; default = null; sensitive = true }
