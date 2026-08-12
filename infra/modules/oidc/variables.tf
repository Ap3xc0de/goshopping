variable "environment" {
  type        = string
  description = "Deployment environment (staging|production)"
}

variable "github_org" {
  type        = string
  description = "GitHub organization or user name"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository name"
}

variable "create_oidc_provider" {
  type        = bool
  description = "Create the GitHub OIDC provider (true once per account; other envs data-source it)"
  default     = false
}
