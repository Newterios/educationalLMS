resource "digitalocean_vpc" "edulms" {
  name     = "${var.project_name}-vpc"
  region   = var.region
  ip_range = var.vpc_ip_range
}

resource "digitalocean_firewall" "edulms" {
  name = "${var.project_name}-fw"
  droplet_ids = [digitalocean_droplet.edulms_app.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "icmp"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

resource "digitalocean_droplet" "edulms_app" {
  name       = "${var.project_name}-app-1"
  region     = var.region
  size       = var.droplet_size
  image      = "ubuntu-22-04-x64"
  ssh_keys   = var.ssh_key_ids
  vpc_uuid   = digitalocean_vpc.edulms.id
  monitoring = true

  user_data = <<-EOT
    #!/bin/bash
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release
  EOT

  lifecycle {
    create_before_destroy = true
  }
}
