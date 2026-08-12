output "jwt_signing_key_arn" { value = aws_secretsmanager_secret.jwt_signing_key.arn }
output "third_party_api_keys_arn" { value = aws_secretsmanager_secret.third_party_api_keys.arn }
