resource "aws_secretsmanager_secret" "jwt_signing_key" {
  name        = "goshopping/jwt-signing-key"
  description = "JWT signing key for goshopping ${var.environment}"
}

resource "aws_secretsmanager_secret_version" "jwt_signing_key" {
  secret_id     = aws_secretsmanager_secret.jwt_signing_key.id
  secret_string = jsonencode({ key = var.jwt_signing_key })
}

resource "aws_secretsmanager_secret" "third_party_api_keys" {
  name        = "goshopping/third-party-api-keys"
  description = "Third-party API keys (Wompi, PayU, Siigo, Alegra, Meta, Google)"
}

resource "aws_secretsmanager_secret_version" "third_party_api_keys" {
  secret_id = aws_secretsmanager_secret.third_party_api_keys.id
  secret_string = jsonencode({
    wompi_public_key     = ""
    wompi_private_key    = ""
    payu_api_key         = ""
    payu_merchant_id     = ""
    siigo_api_key        = ""
    alegra_email         = ""
    alegra_token         = ""
    meta_access_token    = ""
    google_ads_dev_token = ""
    # Read by Config.loadFromAWS() (apps/core) and validated by
    # middleware.RequireOriginSecret. Two keys support rotation without a
    # hard cutover; the Cloudflare Transform Rule (cloudflare_ruleset in each
    # environment's main.tf) must be updated in the SAME apply that rotates
    # origin_shared_secret_current, since both come from the same Terraform
    # variables.
    origin_shared_secret_current  = var.origin_shared_secret_current
    origin_shared_secret_previous = var.origin_shared_secret_previous
  })
}
