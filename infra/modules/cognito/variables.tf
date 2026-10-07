variable "environment" {
  description = "Deployment environment (staging, production, ...). Production enables deletion protection."
  type        = string
}

variable "domain_prefix" {
  description = "Prefix of the hosted UI domain (<prefix>.auth.<region>.amazoncognito.com). Must be unique per region."
  type        = string
}

variable "callback_urls" {
  description = "OAuth callback URLs of the mobile app (deep links such as myapp://auth/callback)."
  type        = list(string)

  validation {
    condition     = length(var.callback_urls) > 0
    error_message = "At least one callback URL is required."
  }
}

variable "logout_urls" {
  description = "OAuth sign-out URLs of the mobile app."
  type        = list(string)

  validation {
    condition     = length(var.logout_urls) > 0
    error_message = "At least one logout URL is required."
  }
}

# --- Google ---

variable "enable_google" {
  description = "Create the Google identity provider."
  type        = bool
  default     = false
}

variable "google_client_id" {
  description = "Google OAuth client ID. Required when enable_google is true."
  type        = string
  default     = null
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret. Required when enable_google is true."
  type        = string
  default     = null
  sensitive   = true
}

# --- Facebook ---

variable "enable_facebook" {
  description = "Create the Facebook identity provider."
  type        = bool
  default     = false
}

variable "facebook_app_id" {
  description = "Facebook app ID. Required when enable_facebook is true."
  type        = string
  default     = null
  sensitive   = true
}

variable "facebook_app_secret" {
  description = "Facebook app secret. Required when enable_facebook is true."
  type        = string
  default     = null
  sensitive   = true
}

# --- Sign in with Apple ---

variable "enable_apple" {
  description = "Create the Sign in with Apple identity provider."
  type        = bool
  default     = false
}

variable "apple_services_id" {
  description = "Apple Services ID (used as the client ID). Required when enable_apple is true."
  type        = string
  default     = null
  sensitive   = true
}

variable "apple_team_id" {
  description = "Apple developer team ID. Required when enable_apple is true."
  type        = string
  default     = null
  sensitive   = true
}

variable "apple_key_id" {
  description = "Apple Sign in with Apple key ID. Required when enable_apple is true."
  type        = string
  default     = null
  sensitive   = true
}

variable "apple_private_key" {
  description = "Contents of the Apple .p8 private key. Required when enable_apple is true."
  type        = string
  default     = null
  sensitive   = true
}
