resource "google_container_cluster" "gke" {
  name     = var.cluster_name
  location = var.zone

  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.subnet.id

  remove_default_node_pool = true
  initial_node_count       = 1


  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = "REGULAR"
  }

  resource_labels = local.labels

  deletion_protection = false

  depends_on = [google_project_service.container]
}


resource "google_container_node_pool" "primary" {
  name       = "${var.cluster_name}-pool"
  cluster    = google_container_cluster.gke.name
  location   = var.zone
  node_count = var.node_count

  node_config {
    machine_type    = var.machine_type
    disk_size_gb    = 30
    service_account = google_service_account.nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    resource_labels = local.labels

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }

  depends_on = [google_project_iam_member.node_roles]
}
