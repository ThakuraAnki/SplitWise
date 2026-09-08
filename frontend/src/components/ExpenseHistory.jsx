import { useEffect, useState } from 'react'; 
import { getHistory, paiseToRupees } from '../lib/api.js';

export default function ExpenseHistory({ groupId, memberNames, refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getHistory(groupId);
        if (!cancelled) setHistory(data.history);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // Cleanup guard: if the component unmounts (or groupId/refreshKey
    // changes) before the fetch resolves, don't call setState on a
    // gone/stale component. A small but real correctness detail.
    return () => {
      cancelled = true;
    };
  }, [groupId, refreshKey]);

  const nameOf = (id) => memberNames?.[id] || id;

  if (loading) return <div className="history">Loading history…</div>;

  return (
    <div className="history">
      <style>{`
        .history { font-family: system-ui, -apple-system, sans-serif; max-width: 520px; }
        .history__error {
          background: #fdecea; color: #611a15; padding: 8px 10px;
          border-radius: 6px; font-size: 13px; margin-bottom: 10px;
        }
        .history__empty { color: #6b7280; padding: 16px 0; text-align: center; }
        .history__item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 6px;
        }
        .history__badge {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;
          padding: 2px 8px; border-radius: 999px; font-weight: 600;
        }
        .history__badge--expense { background: #eef2ff; color: #3730a3; }
        .history__badge--settlement { background: #ecfdf5; color: #065f46; }
        .history__text { font-size: 14px; color: #111827; }
        .history__amount { font-weight: 600; color: #111827; }
      `}</style>

      {error && <div className="history__error">{error}</div>}

      {history.length === 0 ? (
        <div className="history__empty">No activity yet.</div>
      ) : (
        history.map((item) => (
          <div className="history__item" key={item.id}>
            {item.type === 'expense' ? (
              <>
                <span className="history__text">
                  <span className="history__badge history__badge--expense">expense</span>{' '}
                  <strong>{nameOf(item.paidBy)}</strong> paid for {item.description}
                </span>
                <span className="history__amount">₹{paiseToRupees(item.totalAmount)}</span>
              </>
            ) : (
              <>
                <span className="history__text">
                  <span className="history__badge history__badge--settlement">settled</span>{' '}
                  <strong>{nameOf(item.from)}</strong> paid <strong>{nameOf(item.to)}</strong>
                </span>
                <span className="history__amount">₹{paiseToRupees(item.amount)}</span>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}