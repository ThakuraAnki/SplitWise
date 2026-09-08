// src/components/GroupView.jsx
import { useState } from 'react';
import AddExpenseForm from './AddExpenseForm.jsx';
import BalancesView from './BalancesView.jsx';
import ExpenseHistory from './ExpenseHistory.jsx';

export default function GroupView({ group, currentUserId, onLeaveGroup }) {
  const [refreshKey, setRefreshKey] = useState(0);
  console.log("❌❌ GroupView Props: ", group);
  const members = group.memberIds.map((handle) => ({ id: handle, name: handle }));
  const memberNames = Object.fromEntries(members.map((m) => [m.id, m.name]));

  function handleChanged() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="group-view">
      <style>{`
        .group-view { font-family: system-ui, -apple-system, sans-serif; }
        .group-view__header {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: 4px;
        }
        .group-view__title { font-size: 20px; font-weight: 600; color: #111827; margin: 0; }
        .group-view__members { color: #6b7280; font-size: 13px; margin: 0 0 20px; }
        .group-view__leave {
          background: none; border: none; color: #2563eb;
          font-size: 13px; cursor: pointer; padding: 0;
        }
        .group-view__section-title {
          font-size: 14px; font-weight: 600; color: #374151;
          margin: 24px 0 10px; text-transform: uppercase; letter-spacing: 0.03em;
        }
        .group-view__you {
          font-size: 12px; color: #6b7280; margin-left: 6px; font-weight: 400;
          text-transform: none; letter-spacing: 0;
        }
      `}</style>

      <div className="group-view__header">
        <h2 className="group-view__title">{group.name}</h2>
        <button className="group-view__leave" onClick={onLeaveGroup}>
          ← switch group
        </button>
      </div>
      <p className="group-view__members">Members: {group.memberIds.join(', ')}</p>

      <div className="group-view__section-title">Add an expense</div>
      <AddExpenseForm groupId={group.id} members={members} onExpenseAdded={handleChanged} />

      <div className="group-view__section-title">
        Balances
        <span className="group-view__you">(you are {currentUserId})</span>
      </div>
      <BalancesView
        groupId={group.id}
        currentUserId={currentUserId}
        memberNames={memberNames}
        refreshKey={refreshKey}
        onSettled={handleChanged}
      />

      <div className="group-view__section-title">History</div>
      <ExpenseHistory groupId={group.id} memberNames={memberNames} refreshKey={refreshKey} />
    </div>
  );
}