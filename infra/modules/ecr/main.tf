# Map keys stay stable for ECS lookups; repo names are env-prefixed.
locals {
  repos = {
    "goshopping-core"         = "goshopping-${var.environment}-core"
    "goshopping-integrations" = "goshopping-${var.environment}-integrations"
    "goshopping-ai-engine"    = "goshopping-${var.environment}-ai-engine"
  }
}

# MUTABLE: deploy workflows still retag :latest. Switch to IMMUTABLE + SHA-only when that stops.
resource "aws_ecr_repository" "repos" {
  for_each             = local.repos
  name                 = each.value
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Environment = var.environment }
}

resource "aws_ecr_lifecycle_policy" "repos" {
  for_each   = aws_ecr_repository.repos
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}
