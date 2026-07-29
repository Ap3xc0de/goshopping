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
  description = "CIDR permitido para SSH (solo si key_pair_name está definido)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "anthropic_api_key" {
  description = "API key de Anthropic para el AI Engine (dejar vacío si no se usa)"
  type        = string
  default     = ""
  sensitive   = true
}
