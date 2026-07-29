output "public_ip" {
  description = "IP pública del servidor"
  value       = aws_eip.dev.public_ip
}

output "core_api_url" {
  description = "URL del Core API"
  value       = "http://${aws_eip.dev.public_ip}:3000"
}

output "superadmin_url" {
  description = "URL del SuperAdmin Panel"
  value       = "http://${aws_eip.dev.public_ip}:3003"
}

output "admin_url" {
  description = "URL del Admin Panel"
  value       = "http://${aws_eip.dev.public_ip}:3010"
}

output "storefront_url" {
  description = "URL del Storefront"
  value       = "http://${aws_eip.dev.public_ip}:3004"
}

output "ai_engine_url" {
  description = "URL del AI Engine"
  value       = "http://${aws_eip.dev.public_ip}:3002"
}

output "ssh_command" {
  description = "Comando SSH (si se configuró key pair)"
  value       = var.key_pair_name != "" ? "ssh -i ~/.ssh/${var.key_pair_name}.pem ubuntu@${aws_eip.dev.public_ip}" : "SSH no configurado (sin key pair)"
}

output "all_urls" {
  description = "Todas las URLs del deployment"
  value = join("\n", [
    "  SuperAdmin:  http://${aws_eip.dev.public_ip}:3003  →  admin@goshopping.co / demo123456",
    "  Admin Panel: http://${aws_eip.dev.public_ip}:3010  →  vendedor@demo.co / demo123456",
    "  Storefront:  http://${aws_eip.dev.public_ip}:3004",
    "  Core API:    http://${aws_eip.dev.public_ip}:3000/health",
    "  AI Engine:   http://${aws_eip.dev.public_ip}:3002/health",
  ])
}
