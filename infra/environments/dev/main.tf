# ══════════════════════════════════════════
# VPC SIMPLE (no NAT Gateway = ahorro de costos)
# ══════════════════════════════════════════

resource "aws_vpc" "dev" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "${var.project_name}-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.dev.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.project_name}-public" }
}

resource "aws_internet_gateway" "dev" {
  vpc_id = aws_vpc.dev.id
  tags   = { Name = "${var.project_name}-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.dev.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.dev.id
  }
  tags = { Name = "${var.project_name}-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ══════════════════════════════════════════
# SECURITY GROUP
# ══════════════════════════════════════════

resource "aws_security_group" "dev" {
  name_prefix = "${var.project_name}-sg-"
  vpc_id      = aws_vpc.dev.id

  # Core API
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Core API"
  }

  # AI Engine
  ingress {
    from_port   = 3002
    to_port     = 3002
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "AI Engine"
  }

  # SuperAdmin Panel
  ingress {
    from_port   = 3003
    to_port     = 3003
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SuperAdmin"
  }

  # Admin Panel
  ingress {
    from_port   = 3010
    to_port     = 3010
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Admin Panel"
  }

  # Storefront
  ingress {
    from_port   = 3004
    to_port     = 3004
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Storefront"
  }

  # HTTP (para Nginx reverse proxy si se agrega después)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # SSH — only when key pair AND a non-empty CIDR are provided (no open 0.0.0.0/0 default)
  dynamic "ingress" {
    for_each = var.key_pair_name != "" && var.allowed_ssh_cidr != "" ? [1] : []
    content {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [var.allowed_ssh_cidr]
      description = "SSH"
    }
  }

  # Egress — todo permitido
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-sg" }

  lifecycle {
    create_before_destroy = true
  }
}

# ══════════════════════════════════════════
# AMI: Ubuntu 24.04 LTS
# ══════════════════════════════════════════

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ══════════════════════════════════════════
# IAM — EC2 puede leer desde S3
# ══════════════════════════════════════════

resource "aws_iam_role" "ec2_role" {
  name_prefix = "${var.project_name}-ec2-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "s3_access" {
  name_prefix = "${var.project_name}-s3-"
  role        = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.deploy.arn,
        "${aws_s3_bucket.deploy.arn}/*"
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name_prefix = "${var.project_name}-profile-"
  role        = aws_iam_role.ec2_role.name
}

# ══════════════════════════════════════════
# S3 — Bucket temporal para el bundle de deploy
# ══════════════════════════════════════════

resource "aws_s3_bucket" "deploy" {
  bucket_prefix = "${var.project_name}-deploy-"
  force_destroy = true # Permite destruir bucket con contenido
  tags          = { Name = "${var.project_name}-deploy" }
}

resource "aws_s3_object" "app_bundle" {
  bucket = aws_s3_bucket.deploy.id
  key    = "app-bundle.tar.gz"
  source = "${path.module}/../../../app-bundle.tar.gz"
  etag   = filemd5("${path.module}/../../../app-bundle.tar.gz")
}

# ══════════════════════════════════════════
# EC2 INSTANCE (merged: networking + IAM + user_data)
# ══════════════════════════════════════════

resource "aws_instance" "dev" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.dev.id]
  key_name               = var.key_pair_name != "" ? var.key_pair_name : null
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user-data.sh", {
    anthropic_api_key = var.anthropic_api_key
    jwt_secret        = var.jwt_secret
    db_password       = var.db_password
  })

  # Esperar a que el S3 bundle esté subido antes de crear la instancia
  depends_on = [aws_s3_object.app_bundle]

  tags = {
    Name = "${var.project_name}-server"
  }
}

# ══════════════════════════════════════════
# ELASTIC IP (IP fija para URLs consistentes)
# ══════════════════════════════════════════

resource "aws_eip" "dev" {
  domain   = "vpc"
  instance = aws_instance.dev.id
  tags     = { Name = "${var.project_name}-eip" }
}
