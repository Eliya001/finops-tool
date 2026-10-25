CREATE TABLE IF NOT EXISTS clusters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  region TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS namespaces (
  id SERIAL PRIMARY KEY,
  cluster_id INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (cluster_id, name)
);

CREATE TABLE IF NOT EXISTS workloads (
  id SERIAL PRIMARY KEY,
  namespace_id INTEGER NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  requested_cpu NUMERIC,
  requested_memory NUMERIC,
  UNIQUE (namespace_id, name, kind)
);

CREATE TABLE IF NOT EXISTS cost_snapshots (
  id SERIAL PRIMARY KEY,
  workload_id INTEGER NOT NULL REFERENCES workloads(id) ON DELETE CASCADE,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  cpu_cost NUMERIC NOT NULL DEFAULT 0,
  memory_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS usage_snapshots (
  id SERIAL PRIMARY KEY,
  workload_id INTEGER NOT NULL REFERENCES workloads(id) ON DELETE CASCADE,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  actual_cpu_used NUMERIC,
  actual_memory_used NUMERIC
);

CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  workload_id INTEGER NOT NULL REFERENCES workloads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  estimated_monthly_savings NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_cost_snapshots_workload ON cost_snapshots(workload_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_workload ON usage_snapshots(workload_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
