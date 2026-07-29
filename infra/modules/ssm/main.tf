resource "aws_ssm_parameter" "db_host" {
  name  = "/goshopping/${var.environment}/db-host"
  type  = "SecureString"
  value = var.db_host
  tags  = { Environment = var.environment }
}

resource "aws_ssm_parameter" "core_api_url" {
  name  = "/goshopping/${var.environment}/core-api-url"
  type  = "String"
  value = var.core_api_url
  tags  = { Environment = var.environment }
}

resource "aws_ssm_parameter" "integrations_url" {
  name  = "/goshopping/${var.environment}/integrations-url"
  type  = "String"
  value = var.integrations_url
  tags  = { Environment = var.environment }
}

resource "aws_ssm_parameter" "sqs_order_events" {
  name  = "/goshopping/${var.environment}/sqs-order-events"
  type  = "String"
  value = var.sqs_queue_urls["order-events"]
  tags  = { Environment = var.environment }
}

resource "aws_ssm_parameter" "sqs_payment_events" {
  name  = "/goshopping/${var.environment}/sqs-payment-events"
  type  = "String"
  value = var.sqs_queue_urls["payment-events"]
  tags  = { Environment = var.environment }
}

resource "aws_ssm_parameter" "sqs_accounting_events" {
  name  = "/goshopping/${var.environment}/sqs-accounting-events"
  type  = "String"
  value = var.sqs_queue_urls["accounting-events"]
  tags  = { Environment = var.environment }
}

resource "aws_ssm_parameter" "sqs_notification_events" {
  name  = "/goshopping/${var.environment}/sqs-notification-events"
  type  = "String"
  value = var.sqs_queue_urls["notification-events"]
  tags  = { Environment = var.environment }
}

resource "aws_ssm_parameter" "sqs_marketing_events" {
  name  = "/goshopping/${var.environment}/sqs-marketing-events"
  type  = "String"
  value = var.sqs_queue_urls["marketing-events"]
  tags  = { Environment = var.environment }
}
