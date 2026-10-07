data "aws_region" "current" {}

locals {
  name = "goshopping-shoppers-${var.environment}"

  provider_name = {
    google   = "Google"
    facebook = "Facebook"
    apple    = "SignInWithApple"
  }
  enabled_identity_providers = concat(
    var.enable_google ? [local.provider_name.google] : [],
    var.enable_facebook ? [local.provider_name.facebook] : [],
    var.enable_apple ? [local.provider_name.apple] : [],
  )
}

resource "aws_cognito_user_pool" "shoppers" {
  name = local.name

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = "OFF"
  deletion_protection      = var.environment == "production" ? "ACTIVE" : "INACTIVE"

  username_configuration {
    case_sensitive = false
  }

  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Changing the schema of an existing pool forces its replacement.
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 2048
    }
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 2048
    }
  }

  tags = { Environment = var.environment }
}

resource "aws_cognito_user_pool_domain" "shoppers" {
  domain       = var.domain_prefix
  user_pool_id = aws_cognito_user_pool.shoppers.id
}

# --- Identity providers (each created only when enabled) ---

resource "aws_cognito_identity_provider" "google" {
  count = var.enable_google ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.shoppers.id
  provider_name = local.provider_name.google
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "profile email openid"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    picture  = "picture"
    username = "sub"
  }

  lifecycle {
    precondition {
      condition     = var.google_client_id != null && var.google_client_id != "" && var.google_client_secret != null && var.google_client_secret != ""
      error_message = "google_client_id and google_client_secret are required when enable_google is true."
    }
  }
}

resource "aws_cognito_identity_provider" "facebook" {
  count = var.enable_facebook ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.shoppers.id
  provider_name = local.provider_name.facebook
  provider_type = "Facebook"

  provider_details = {
    client_id        = var.facebook_app_id
    client_secret    = var.facebook_app_secret
    authorize_scopes = "public_profile,email"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    picture  = "picture"
    username = "id"
  }

  lifecycle {
    precondition {
      condition     = var.facebook_app_id != null && var.facebook_app_id != "" && var.facebook_app_secret != null && var.facebook_app_secret != ""
      error_message = "facebook_app_id and facebook_app_secret are required when enable_facebook is true."
    }
  }
}

resource "aws_cognito_identity_provider" "apple" {
  count = var.enable_apple ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.shoppers.id
  provider_name = local.provider_name.apple
  provider_type = "SignInWithApple"

  provider_details = {
    client_id        = var.apple_services_id
    team_id          = var.apple_team_id
    key_id           = var.apple_key_id
    private_key      = var.apple_private_key
    authorize_scopes = "email name"
  }

  # Apple does not return a profile picture.
  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
  }

  lifecycle {
    precondition {
      condition = alltrue([
        for v in [var.apple_services_id, var.apple_team_id, var.apple_key_id, var.apple_private_key] :
        v != null && v != ""
      ])
      error_message = "apple_services_id, apple_team_id, apple_key_id and apple_private_key are required when enable_apple is true."
    }
  }
}

# --- Mobile app client (public, PKCE-capable code flow, no secret) ---

resource "aws_cognito_user_pool_client" "mobile" {
  name         = "${local.name}-mobile"
  user_pool_id = aws_cognito_user_pool.shoppers.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls

  supported_identity_providers = concat(["COGNITO"], local.enabled_identity_providers)

  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  depends_on = [
    aws_cognito_identity_provider.google,
    aws_cognito_identity_provider.facebook,
    aws_cognito_identity_provider.apple,
  ]
}
