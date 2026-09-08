const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:4000/api';

async function request(path, options = {}) {
    console.log("🔥🔥 Request: ", path, " - ", options);
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
}

export function createGroup({ name, memberIds }) {
    return request('/groups', { method: 'POST', body: JSON.stringify({ name, memberIds }) });
}

export function getGroup(groupId) {
    return request(`/groups/${groupId}`);
}

export function addExpense(groupId, expensePayload) {
    return request(`/groups/${groupId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(expensePayload),
    });
}

export function getBalances(groupId) {
    return request(`/groups/${groupId}/balances`);
}

export function getHistory(groupId) {
    return request(`/groups/${groupId}/history`);
}

// A stable idempotency key generator: one key per "settle up" attempt made
// by the user, reused automatically if the browser retries the request.
export function settleUp(groupId, { from, to, amount, idempotencyKey }) {
    return request(`/groups/${groupId}/settle`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ from, to, amount }),
    });
}

// Convert a rupee amount typed by a user (e.g. "450.50") into integer
// paise for the API. Frontend NEVER sends floats to the backend.
export function rupeesToPaise(rupeeString) {
    const rupees = Number(rupeeString);
    if (Number.isNaN(rupees) || rupees <= 0) {
        throw new Error('Enter a valid positive amount');
    }
    return Math.round(rupees * 100);
}

// Convert integer paise back into a display string, e.g. 4550 -> "45.50"
export function paiseToRupees(paise) {
    return (paise / 100).toFixed(2);
}