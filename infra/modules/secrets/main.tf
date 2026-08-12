resource "aws_secretsmanager_secret" "jwt_signing_key" {
  name        = "goshopping/${var.environment}/jwt-signing-key"
  description = "JWT signing key for goshopping ${var.environment}"
}

resource "aws_secretsmanager_secret_version" "jwt_signing_key" {
  secret_id     = aws_secretsmanager_secret.jwt_signing_key.id
  secret_string = jsonencode({ key = var.jwt_signing_key })
}

# db-credentials lives in the RDS module (needs host after DB create);
# named goshopping/${var.environment}/db-credentials there.

resource "aws_secretsmanager_secret" "third_party_api_keys" {
  name        = "goshopping/${var.environment}/third-party-api-keys"
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
  })
}
