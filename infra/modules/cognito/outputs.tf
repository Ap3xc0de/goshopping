output "user_pool_id" {
  value = aws_cognito_user_pool.shoppers.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.shoppers.arn
}

output "app_client_id" {
  value = aws_cognito_user_pool_client.mobile.id
}

output "hosted_ui_domain" {
  description = "Full hosted UI domain. Register https://<domain>/oauth2/idpresponse with each social provider."
  value       = "${aws_cognito_user_pool_domain.shoppers.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
}

output "issuer" {
  description = "Token issuer (iss claim)."
  value       = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.shoppers.id}"
}

output "jwks_url" {
  value = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.shoppers.id}/.well-known/jwks.json"
}
