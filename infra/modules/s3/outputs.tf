output "assets_bucket_name"      { value = aws_s3_bucket.assets.bucket }
output "assets_bucket_arn"       { value = aws_s3_bucket.assets.arn }
output "superadmin_bucket_id"    { value = aws_s3_bucket.superadmin.id }
output "superadmin_bucket_arn"   { value = aws_s3_bucket.superadmin.arn }
output "admin_bucket_id"         { value = aws_s3_bucket.admin.id }
output "admin_bucket_arn"        { value = aws_s3_bucket.admin.arn }
output "storefront_bucket_id"    { value = aws_s3_bucket.storefront.id }
output "storefront_bucket_arn"   { value = aws_s3_bucket.storefront.arn }
