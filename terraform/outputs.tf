output "droplet_name" {
  value = digitalocean_droplet.edulms_app.name
}

output "droplet_public_ip" {
  value = digitalocean_droplet.edulms_app.ipv4_address
}

output "vpc_id" {
  value = digitalocean_vpc.edulms.id
}