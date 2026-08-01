output "superadmin_distribution_id" { value = aws_cloudfront_distribution.superadmin.id }
output "superadmin_domain_name" { value = aws_cloudfront_distribution.superadmin.domain_name }
output "admin_distribution_id" { value = aws_cloudfront_distribution.admin.id }
output "admin_domain_name" { value = aws_cloudfront_distribution.admin.domain_name }
output "storefront_distribution_id" { value = aws_cloudfront_distribution.storefront.id }
output "storefront_domain_name" { value = aws_cloudfront_distribution.storefront.domain_name }
output "cdn_distribution_id" { value = aws_cloudfront_distribution.cdn.id }
output "cdn_domain_name" { value = aws_cloudfront_distribution.cdn.domain_name }
