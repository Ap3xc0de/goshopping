variable "environment"     { type = string }
variable "jwt_signing_key" {
  type      = string
  sensitive = true
}
