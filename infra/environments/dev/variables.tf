variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium" # 2 vCPU, 4GB RAM — suficiente para todos los servicios
}

variable "key_pair_name" {
  description = "Nombre del key pair para SSH (dejar vacío para no crear acceso SSH)"
  type        = string
  default     = ""
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "goshopping-dev"
}

variable "allowed_ssh_cidr" {
  description = "CIDR permitido para SSH (vacío = sin regla SSH; no usar 0.0.0.0/0)"
  type        = string
  default     = ""
}

variable "jwt_secret" {
  description = "JWT signing secret for the dev EC2 stack (required via tfvars / CI; not committed)"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Postgres password for the local docker stack on the dev EC2 (required via tfvars / CI)"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "API key de Anthropic para el AI Engine (dejar vacío si no se usa)"
  type        = string
  default     = ""
  sensitive   = true
}
