import { money } from './format.js';

function StatCards({ summary }) {
  const cards = [
    { label: 'Monthly cost', value: money(summary.monthly_cost) },
    { label: 'Savings identified', value: money(summary.savings_identified), note: 'from open recommendations' },
    { label: 'Savings realized', value: money(summary.savings_realized), note: 'from applied recommendations' },
    { label: 'Open recommendations', value: summary.open_recommendations },
  ];

  return (
    <div className="cards">
      {cards.map((card) => (
        <div className="card" key={card.label}>
          <div className="card-label">{card.label}</div>
          <div className="card-value">{card.value}</div>
          {card.note && <div className="card-note">{card.note}</div>}
        </div>
      ))}
    </div>
  );
}

export default StatCards;
