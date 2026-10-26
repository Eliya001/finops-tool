resource "google_service_account" "nodes" {
  account_id   = "${var.cluster_name}-nodes"
  display_name = "GKE node service account for ${var.cluster_name}"


  depends_on = [google_project_service.iam]
}

resource "google_project_iam_member" "node_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/artifactregistry.reader",
  ])


  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.nodes.email}"

  depends_on = [google_project_service.resourcemanager]

}
