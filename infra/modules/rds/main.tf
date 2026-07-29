resource "aws_db_subnet_group" "main" {
  name       = "goshopping-${var.environment}"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "goshopping-db-subnet-group-${var.environment}" }
}

resource "aws_security_group" "rds" {
  name        = "goshopping-rds-${var.environment}"
  description = "Allow Postgres from ECS tasks only"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "goshopping-rds-sg-${var.environment}" }
}

resource "aws_db_instance" "main" {
  identifier             = "goshopping-${var.environment}"
  engine                 = "postgres"
  engine_version         = "16.3"
  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = var.max_allocated_storage
  storage_encrypted      = true

  db_name  = "goshopping"
  username = "goshopping"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = var.multi_az

  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = false
  final_snapshot_identifier = "goshopping-${var.environment}-final"

  performance_insights_enabled = true

  tags = { Name = "goshopping-rds-${var.environment}" }
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "goshopping/db-credentials"
  description = "PostgreSQL credentials for goshopping ${var.environment}"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = "goshopping"
    username = "goshopping"
    password = var.db_password
  })
}
