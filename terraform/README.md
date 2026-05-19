# Terraform - minimal IaC for Final criteria

This folder provisions:
- 1 VPC
- 1 Ubuntu droplet (VM)
- Firewall rules (SSH, HTTP, HTTPS)

## Usage

1) Install Terraform
2) Copy vars:

cp terraform.tfvars.example terraform.tfvars

3) Fill in:
- do_token
- ssh_key_ids

4) Run:

terraform init
terraform plan
terraform apply

5) Get VM IP from outputs

## Notes

- Provider: DigitalOcean (chosen for simplicity and existing project context)
- This is intentionally minimal for assignment compliance.