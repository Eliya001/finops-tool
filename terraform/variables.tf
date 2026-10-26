variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}


variable "region" {
  description = "Region for the network"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Single zone for the cluster"
  type        = string
  default     = "finops-gke"
}

variable "machine_type" {
  description = "machine type for the cluster nodes"
  type        = string
  default     = "e2-standard-2"
}

variable "node_count" {
  description = "Number of nodes in the cluster"
  type        = number
  default     = 2
}

variable "cluster_name" {
  description = "Name of the GKE cluster, also used to name the network"
  type        = string
  default     = "finops-gke"
}
