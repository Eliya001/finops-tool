output "cluster_name" {
  value = google_container_cluster.gke.name
}

output "cluster_zone" {
  value = google_container_cluster.gke.location
}

output "get_credentials_command" {
  description = "Run this after apply to connect to the kubectl cluster"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.gke.name} --zone ${var.zone} --project ${var.project_id}"
}


