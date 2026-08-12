output "parameter_names" {
  value = {
    db_host                 = aws_ssm_parameter.db_host.name
    core_api_url            = aws_ssm_parameter.core_api_url.name
    integrations_url        = aws_ssm_parameter.integrations_url.name
    sqs_order_events        = aws_ssm_parameter.sqs_order_events.name
    sqs_payment_events      = aws_ssm_parameter.sqs_payment_events.name
    sqs_accounting_events   = aws_ssm_parameter.sqs_accounting_events.name
    sqs_notification_events = aws_ssm_parameter.sqs_notification_events.name
    sqs_marketing_events    = aws_ssm_parameter.sqs_marketing_events.name
  }
}
