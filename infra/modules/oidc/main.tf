resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

data "aws_iam_policy_document" "github_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main",
        "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/staging",
        "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/develop",
        "repo:${var.github_org}/${var.github_repo}:environment:${var.environment}",
      ]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "goshopping-github-actions-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json
  description        = "Role assumed by GitHub Actions via OIDC for ${var.environment}"
}

data "aws_iam_policy_document" "github_actions_permissions" {
  # ECR auth token is account-scoped
  statement {
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # ECR — push/pull env-prefixed repos
  statement {
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
    ]
    resources = [
      "arn:aws:ecr:*:*:repository/goshopping-${var.environment}-*",
    ]
  }

  # ECS — RegisterTaskDefinition does not support resource-level permissions
  statement {
    effect    = "Allow"
    actions   = ["ecs:RegisterTaskDefinition", "ecs:DescribeTaskDefinition"]
    resources = ["*"]
  }

  # ECS — force deployments on this env's cluster/services
  statement {
    effect = "Allow"
    actions = [
      "ecs:UpdateService",
      "ecs:DescribeServices",
      "ecs:DescribeClusters",
      "ecs:ListTasks",
      "ecs:DescribeTasks",
    ]
    resources = [
      "arn:aws:ecs:*:*:cluster/goshopping-${var.environment}",
      "arn:aws:ecs:*:*:service/goshopping-${var.environment}/*",
      "arn:aws:ecs:*:*:task/goshopping-${var.environment}/*",
    ]
  }

  # S3 — sync frontend builds for this env
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      "arn:aws:s3:::goshopping-*-${var.environment}",
      "arn:aws:s3:::goshopping-*-${var.environment}/*",
    ]
  }

  # CloudFront — invalidate CDN after deploy
  statement {
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = ["arn:aws:cloudfront::*:distribution/*"]
  }

  # Secrets Manager — env-scoped
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = ["arn:aws:secretsmanager:*:*:secret:goshopping/${var.environment}/*"]
  }

  # SSM — env-scoped
  statement {
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = ["arn:aws:ssm:*:*:parameter/goshopping/${var.environment}/*"]
  }

  # CloudWatch Logs — env-scoped ECS log groups
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = [
      "arn:aws:logs:*:*:log-group:/ecs/goshopping-*-${var.environment}",
      "arn:aws:logs:*:*:log-group:/ecs/goshopping-*-${var.environment}:*",
    ]
  }

  # IAM PassRole — needed to register task definitions
  statement {
    effect  = "Allow"
    actions = ["iam:PassRole"]
    resources = [
      "arn:aws:iam::*:role/goshopping-ecs-task-execution-${var.environment}",
      "arn:aws:iam::*:role/goshopping-ecs-task-${var.environment}",
    ]
  }
}

resource "aws_iam_role_policy" "github_actions" {
  name   = "goshopping-github-actions-policy"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_permissions.json
}
