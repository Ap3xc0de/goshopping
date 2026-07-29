# State local para dev — no necesitamos S3 backend para un ambiente temporal
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # State local — se destruye con terraform destroy
  # NO usar S3 backend para dev
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "goshopping"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}
