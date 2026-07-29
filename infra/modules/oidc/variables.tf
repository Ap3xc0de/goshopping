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
