output "ec2_public_ip" {
  description = "IP publique de l'instance EC2"
  value       = aws_instance.health_platform.public_ip
}

output "ec2_public_dns" {
  description = "DNS public de l'instance EC2"
  value       = aws_instance.health_platform.public_dns
}
