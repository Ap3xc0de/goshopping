variable "environment"        { type = string }
variable "vpc_id"             { type = string }
variable "public_subnet_ids"  { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "ecr_urls"           { type = map(string) }
variable "task_cpu" {
  type    = number
  default = 256
}
variable "task_memory" {
  type    = number
  default = 512
}
variable "desired_count" {
  type    = number
  default = 1
}
variable "certificate_arn"    { type = string }
variable "api_domain_name"    { type = string }
variable "frontend_certificate_arn" { type = string }
variable "admin_domain_name"       { type = string }
variable "superadmin_domain_name"  { type = string }
variable "storefront_domain_name"  { type = string }
