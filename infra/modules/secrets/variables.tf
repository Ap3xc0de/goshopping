variable "environment"     { type = string }
variable "jwt_signing_key" {
  type      = string
  sensitive = true
}
variable "origin_shared_secret_current" {
  type      = string
  sensitive = true
}
variable "origin_shared_secret_previous" {
  type      = string
  sensitive = true
  default   = ""
}
