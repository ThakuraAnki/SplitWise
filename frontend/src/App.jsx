// src/App.jsx
import { useState } from 'react';
import CreateGroup from './components/CreateGroup.jsx';
import GroupView from './components/GroupView.jsx';
import { getGroup } from './lib/api.js';

export default function App() {
  const [group, setGroup] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loadId, setLoadId] = useState('');
  const [error, setError] = useState(null);

  console.log("🍴🍴 App.jsx: ", group);

  function handleGroupReady(loadedGroup) {
    setGroup(loadedGroup);
    setCurrentUserId(loadedGroup.memberIds[0]); // default "me" to first member
    setError(null);
  }

  async function handleLoadExisting(e) {
    e.preventDefault();
    setError(null);
    try {
      const loaded = await getGroup(loadId.trim());
      handleGroupReady(loaded);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <style>{`
        .app {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 560px;
          margin: 0 auto;
          padding: 32px 20px;
          color: #111827;
        }
        .app__title { font-size: 26px; font-weight: 700; margin: 0 0 4px; }
        .app__tagline { color: #6b7280; margin: 0 0 28px; font-size: 14px; }
        .app__card {
          border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;
        }
        .app__card-title { font-size: 15px; font-weight: 600; margin: 0 0 12px; }
        .app__row { display: flex; gap: 8px; }
        .app__row input {
          flex: 1; padding: 8px 10px; border: 1px solid #d1d5db;
          border-radius: 6px; font-size: 14px;
        }
        .app__row button {
          background: #111827; color: white; border: none; border-radius: 6px;
          padding: 8px 14px; font-size: 14px; cursor: pointer;
        }
        .app__error {
          background: #fdecea; color: #611a15; padding: 8px 10px;
          border-radius: 6px; font-size: 13px; margin-bottom: 16px;
        }
        .app__who {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #374151; margin-bottom: 20px;
        }
        .app__who select {
          padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;
        }
      `}</style>

      <h1 className="app__title">Splitwise</h1>
      <p className="app__tagline">Split group expenses without the arguments.</p>

      {error && <div className="app__error">{error}</div>}

      {!group ? (
        <>
          <div className="app__card">
            <p className="app__card-title">Create a new group</p>
            <CreateGroup onGroupCreated={handleGroupReady} />
          </div>

          <div className="app__card">
            <p className="app__card-title">Or load an existing group by id</p>
            <form className="app__row" onSubmit={handleLoadExisting}>
              <input
                value={loadId}
                onChange={(e) => setLoadId(e.target.value)}
                placeholder="paste a group id"
              />
              <button type="submit">Load</button>
            </form>
          </div>
        </>
      ) : (
        <>
          <div className="app__who">
            <span>I am:</span>
            <select value={currentUserId} onChange={(e) => setCurrentUserId(e.target.value)}>
              {group.memberIds.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <GroupView
            group={group}
            currentUserId={currentUserId}
            onLeaveGroup={() => setGroup(null)}
          />
        </>
      )}
    </div>
  );
}