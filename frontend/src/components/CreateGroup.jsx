import { useState } from 'react';
import { createGroup } from '../lib/api.js';

export default function CreateGroup({ onGroupCreated }) {
  const [name, setName] = useState('');
  const [membersText, setMembersText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const memberIds = membersText
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    if (memberIds.length < 2) {
      setError('Enter at least 2 members, separated by commas.');
      return;
    }

    setSubmitting(true);
    try {
      const group = await createGroup({ name, memberIds });
      setName('');
      setMembersText('');
      onGroupCreated?.(group);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-group" onSubmit={handleSubmit}>
      <style>{`
        .create-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 420px;
        }
        .create-group__field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 13px;
          color: #374151;
        }
        .create-group__field input {
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }
        .create-group__submit {
          background: #111827;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 14px;
          cursor: pointer;
        }
        .create-group__submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .create-group__error {
          background: #fdecea;
          color: #611a15;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 13px;
        }
      `}</style>

      {error && <div className="create-group__error">{error}</div>}

      <label className="create-group__field">
        Group name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Goa Trip 2026"
          required
        />
      </label>

      <label className="create-group__field">
        Members (comma-separated handles)
        <input
          value={membersText}
          onChange={(e) => setMembersText(e.target.value)}
          placeholder="e.g. alice, bob, carol"
          required
        />
      </label>

      <button className="create-group__submit" type="submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create group'}
      </button>
    </form>
  );
}
