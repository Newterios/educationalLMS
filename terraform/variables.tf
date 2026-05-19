variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Resource name prefix"
  type        = string
  default     = "edulms"
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "fra1"
}

variable "droplet_size" {
  description = "Droplet plan"
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "ssh_key_ids" {
  description = "List of SSH key IDs from DigitalOcean account"
  type        = list(string)
}

variable "vpc_ip_range" {
  description = "Private VPC CIDR"
  type        = string
  default     = "10.30.0.0/16"
}