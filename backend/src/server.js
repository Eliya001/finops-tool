const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/clusters', require('./routes/clusterRoutes'));
app.use('/clusters/:clusterId/namespaces', require('./routes/namespaceRoutes'));
app.use('/namespaces/:namespaceId/workloads', require('./routes/workloadRoutes'));
app.use('/workloads/:workloadId/cost-snapshots', require('./routes/costSnapshotRoutes'));
app.use('/workloads/:workloadId/usage-snapshots', require('./routes/usageSnapshotRoutes'));
app.use('/recommendations', require('./routes/recommendationRoutes'));
app.use('/analysis', require('./routes/analysisRoutes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('FinOps backend running on port ' + PORT);
});
