import { money } from './format.js';

const LABELS = { rightsizing: 'Right-size', idle: 'Idle' };

function describe(rec) {
  const d = rec.details || {};

  if (rec.type === 'idle') {
    const percent = Math.round((d.p95_cpu_used / d.requested_cpu) * 100);
    return 'Uses about ' + percent + '% of its requested CPU. Consider removing it or scaling it to zero.';
  }

  const changes = [];
  if (d.suggested_cpu !== d.current_cpu) {
    changes.push('CPU ' + d.current_cpu + ' \u2192 ' + d.suggested_cpu + ' cores');
  }
  if (d.suggested_memory_mb !== d.current_memory_mb) {
    changes.push('Memory ' + d.current_memory_mb + ' \u2192 ' + d.suggested_memory_mb + ' MB');
  }
  return changes.join(', ');
}

function RecommendationsTable({ recommendations, onChangeStatus, busyId }) {
  if (recommendations.length === 0) {
    return <p className="muted">Nothing here.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Workload</th>
            <th>Type</th>
            <th>Suggestion</th>
            <th className="right">Saves / month</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {recommendations.map((rec) => (
            <tr key={rec.id}>
              <td>
                <div className="strong">{rec.workload_name}</div>
                <div className="muted small">
                  {rec.cluster} / {rec.namespace}
                </div>
              </td>
              <td>
                <span className={'badge badge-' + rec.type}>{LABELS[rec.type] || rec.type}</span>
              </td>
              <td>{describe(rec)}</td>
              <td className="right strong">{money(Number(rec.estimated_monthly_savings))}</td>
              <td className="actions">
                {rec.status === 'open' ? (
                  <>
                    <button disabled={busyId === rec.id} onClick={() => onChangeStatus(rec.id, 'applied')}>
                      Mark applied
                    </button>
                    <button
                      className="secondary"
                      disabled={busyId === rec.id}
                      onClick={() => onChangeStatus(rec.id, 'dismissed')}
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <span className="muted small">{rec.status}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RecommendationsTable;
