import { money } from './format.js';

function NamespaceBars({ items }) {
  const max = Math.max(...items.map((item) => item.monthly_cost), 1);

  return (
    <section className="panel">
      <h2>Monthly cost by namespace</h2>
      {items.length === 0 && <p className="muted">No cost data yet.</p>}
      {items.map((item) => (
        <div className="bar-row" key={item.cluster + '/' + item.namespace}>
          <div className="bar-name">{item.namespace}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: (item.monthly_cost / max) * 100 + '%' }} />
          </div>
          <div className="bar-value">{money(item.monthly_cost)}</div>
        </div>
      ))}
    </section>
  );
}

export default NamespaceBars;
