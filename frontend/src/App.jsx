import { useEffect, useState } from 'react';
import { getSummary, getRecommendations, setRecommendationStatus, runAnalysis } from './api.js';
import StatCards from './StatCards.jsx';
import NamespaceBars from './NamespaceBars.jsx';
import RecommendationsTable from './RecommendationsTable.jsx';

const TABS = ['open', 'applied', 'dismissed', 'all'];

function App() {
  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [tab, setTab] = useState('open');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function load(currentTab) {
    try {
      const [summaryData, recommendationData] = await Promise.all([
        getSummary(),
        getRecommendations(currentTab === 'all' ? undefined : currentTab),
      ]);
      setSummary(summaryData);
      setRecommendations(recommendationData);
      setError('');
    } catch {
      setError('Could not reach the backend. Is it running on port 4000?');
    }
  }

  useEffect(() => {
    load(tab);
  }, [tab]);

  async function changeStatus(id, status) {
    setBusyId(id);
    try {
      await setRecommendationStatus(id, status);
      await load(tab);
    } catch {
      setError('Could not update the recommendation.');
    }
    setBusyId(null);
  }

  async function analyzeNow() {
    setAnalyzing(true);
    try {
      await runAnalysis();
      await load(tab);
    } catch {
      setError('The analysis could not be run.');
    }
    setAnalyzing(false);
  }

  return (
    <div className="page">
      <header className="top">
        <h1>FinOps Dashboard</h1>
        <button onClick={analyzeNow} disabled={analyzing}>
          {analyzing ? 'Analyzing...' : 'Run analysis'}
        </button>
      </header>

      {error && <p className="error">{error}</p>}
      {!summary && !error && <p>Loading...</p>}

      {summary && (
        <>
          <StatCards summary={summary} />
          <NamespaceBars items={summary.cost_by_namespace} />

          <section className="panel">
            <h2>Recommendations</h2>
            <div className="tabs">
              {TABS.map((name) => (
                <button key={name} className={name === tab ? 'tab active' : 'tab'} onClick={() => setTab(name)}>
                  {name}
                </button>
              ))}
            </div>
            <RecommendationsTable
              recommendations={recommendations}
              onChangeStatus={changeStatus}
              busyId={busyId}
            />
          </section>
        </>
      )}
    </div>
  );
}

export default App;
