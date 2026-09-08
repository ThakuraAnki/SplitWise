import { useState } from 'react';
import { addExpense, rupeesToPaise } from '../lib/api.js';

export default function AddExpenseForm({ groupId, members, onExpenseAdded }) {
  const [description, setDescription] = useState('');
  const [totalRupees, setTotalRupees] = useState('');
  const [paidBy, setPaidBy] = useState(members[0]?.id || '');
  const [splitType, setSplitType] = useState('equal');
  const [percentages, setPercentages] = useState(
    members.map((m) => ({ participantId: m.id, percentage: '' }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function updatePercentage(participantId, value) {
    setPercentages((prev) =>
      prev.map((p) => (p.participantId === participantId ? { ...p, percentage: value } : p))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const totalAmount = rupeesToPaise(totalRupees);

      let splitInput;
      if (splitType === 'equal') {
        splitInput = { participantIds: members.map((m) => m.id) };
      } else if (splitType === 'percentage') {
        splitInput = {
          percentages: percentages.map((p) => ({
            participantId: p.participantId,
            percentage: Number(p.percentage),
          })),
        };
      }

      await addExpense(groupId, { description, totalAmount, paidBy, splitType, splitInput });

      setDescription('');
      setTotalRupees('');
      onExpenseAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-expense-form" onSubmit={handleSubmit}>
      <style>{`
        .add-expense-form {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .add-expense-form__field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 13px;
          color: #374151;
        }
        .add-expense-form__field input,
        .add-expense-form__field select {
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }
        .add-expense-form__percentages {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .add-expense-form__percentage-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .add-expense-form__percentage-row input {
          width: 70px;
        }
        .add-expense-form__submit {
          background: #111827;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 14px;
          cursor: pointer;
        }
        .add-expense-form__submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .add-expense-form__error {
          background: #fdecea;
          color: #611a15;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 13px;
        }
      `}</style>

      {error && <div className="add-expense-form__error">{error}</div>}

      <label className="add-expense-form__field">
        Description
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Hotel booking"
          required
        />
      </label>

      <label className="add-expense-form__field">
        Total amount (₹)
        <input
          value={totalRupees}
          onChange={(e) => setTotalRupees(e.target.value)}
          placeholder="e.g. 1500.00"
          inputMode="decimal"
          required
        />
      </label>

      <label className="add-expense-form__field">
        Paid by
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label className="add-expense-form__field">
        Split type
        <select value={splitType} onChange={(e) => setSplitType(e.target.value)}>
          <option value="equal">Equally</option>
          <option value="percentage">By percentage</option>
        </select>
      </label>

      {splitType === 'percentage' && (
        <div className="add-expense-form__percentages">
          {members.map((m) => (
            <div className="add-expense-form__percentage-row" key={m.id}>
              <span>{m.name}</span>
              <input
                value={percentages.find((p) => p.participantId === m.id)?.percentage || ''}
                onChange={(e) => updatePercentage(m.id, e.target.value)}
                placeholder="%"
                inputMode="decimal"
              />
            </div>
          ))}
        </div>
      )}

      <button className="add-expense-form__submit" type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add expense'}
      </button>
    </form>
  );
}