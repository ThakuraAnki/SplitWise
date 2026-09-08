import { useEffect, useState } from 'react';
import { getBalances, paiseToRupees, settleUp } from '../lib/api.js';

export default function BalancesView({ groupId, currentUserId, memberNames, refreshKey, onSettled }) {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settlingId, setSettlingId] = useState(null);

  async function loadBalances() {
    setLoading(true);
    setError(null);
    try {
      const data = await getBalances(groupId);
      setBalances(data.balances);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Re-fetch whenever the group changes OR the parent bumps refreshKey
  // (e.g. after an expense is added). Same pattern ExpenseHistory uses.
  useEffect(() => {
    loadBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, refreshKey]);

  async function handleSettle(balance) {
    const idempotencyKey = `${groupId}-${balance.from}-${balance.to}-${Date.now()}`;
    setSettlingId(`${balance.from}-${balance.to}`);
    try {
      await settleUp(groupId, {
        from: balance.from,
        to: balance.to,
        amount: balance.amount,
        idempotencyKey,
      });
      await loadBalances(); // refresh our own balances after settling
      onSettled?.();        // tell the parent so siblings (history) refresh too
    } catch (err) {
      setError(err.message);
    } finally {
      setSettlingId(null);
    }
  }

  const nameOf = (id) => memberNames?.[id] || id;

  if (loading) return <div className="balances-view">Loading balances…</div>;

  return (
    <div className="balances-view">
      <style>{`
        .balances-view {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 480px;
        }
        .balances-view__error {
          background: #fdecea;
          color: #611a15;
          padding: 10px 14px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .balances-view__empty {
          color: #6b7280;
          padding: 24px 0;
          text-align: center;
        }
        .balance-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          margin-bottom: 8px;
        }
        .balance-row__text {
          font-size: 14px;
          color: #111827;
        }
        .balance-row__amount {
          font-weight: 600;
        }
        .balance-row__amount--owed-to-you {
          color: #15803d;
        }
        .balance-row__amount--you-owe {
          color: #b91c1c;
        }
        .balance-row__settle-btn {
          background: #111827;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
        }
        .balance-row__settle-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      {error && <div className="balances-view__error">{error}</div>}

      {balances.length === 0 ? (
        <div className="balances-view__empty">Everyone is settled up 🎉</div>
      ) : (
        balances.map((b) => {
          const key = `${b.from}-${b.to}`;
          const youAreOwed = b.to === currentUserId;
          const youOwe = b.from === currentUserId;

          return (
            <div className="balance-row" key={key}>
              <span className="balance-row__text">
                <strong>{nameOf(b.from)}</strong> owes <strong>{nameOf(b.to)}</strong>{' '}
                <span
                  className={
                    'balance-row__amount ' +
                    (youAreOwed
                      ? 'balance-row__amount--owed-to-you'
                      : youOwe
                        ? 'balance-row__amount--you-owe'
                        : '')
                  }
                >
                  ₹{paiseToRupees(b.amount)}
                </span>
              </span>

              {youOwe && (
                <button
                  className="balance-row__settle-btn"
                  disabled={settlingId === key}
                  onClick={() => handleSettle(b)}
                >
                  {settlingId === key ? 'Settling…' : 'Settle up'}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}