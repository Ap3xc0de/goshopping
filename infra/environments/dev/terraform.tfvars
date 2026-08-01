aws_region    = "us-east-1"
instance_type = "t3.medium"
project_name  = "goshopping-dev"
# key_pair_name    = "mi-key"       # Descomentar si quieres SSH
# allowed_ssh_cidr = "x.x.x.x/32"   # Required with key_pair_name; never 0.0.0.0/0
# anthropic_api_key = "sk-ant-..."  # Descomentar si tienes API key (via -var / local override)

# Required secrets — supply real values via -var, TF_VAR_*, or a local untracked override.
# Do not commit production credentials.
jwt_secret  = "CHANGE_ME"
db_password = "CHANGE_ME"
