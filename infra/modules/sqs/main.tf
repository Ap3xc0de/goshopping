locals {
  queues = [
    "order-events",
    "payment-events",
    "accounting-events",
    "notification-events",
    "marketing-events",
  ]
}

# --- Dead-Letter Queues ---
resource "aws_sqs_queue" "dlq" {
  for_each = toset(local.queues)

  name                      = "goshopping-${each.key}-dlq"
  message_retention_seconds = 1209600 # 14 days
  tags                      = { Environment = var.environment }
}

# --- Main Queues ---
resource "aws_sqs_queue" "main" {
  for_each = toset(local.queues)

  name                       = "goshopping-${each.key}"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 30
  receive_wait_time_seconds  = 10 # long-polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = 3
  })

  tags = { Environment = var.environment }
}

# --- Queue Policies (allow ECS task role to send/receive) ---
resource "aws_sqs_queue_policy" "main" {
  for_each  = aws_sqs_queue.main
  queue_url = each.value.url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
      Resource  = each.value.arn
      Condition = {
        ArnLike = {
          "aws:SourceArn" = "arn:aws:iam::*:role/goshopping-ecs-task-*"
        }
      }
    }]
  })
}
