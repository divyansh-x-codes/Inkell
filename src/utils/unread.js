// Shared utility for managing unread message counts across the app
export const UNREAD_KEY = 'inkwell_unread';

export function getTotalUnread() {
  try {
    const data = JSON.parse(localStorage.getItem(UNREAD_KEY) || '{}');
    return Object.values(data).reduce((sum, n) => sum + n, 0);
  } catch {
    return 0;
  }
}

export function getUnreadForThread(threadId) {
  try {
    const data = JSON.parse(localStorage.getItem(UNREAD_KEY) || '{}');
    return data[threadId] || 0;
  } catch {
    return 0;
  }
}

export function clearUnread(threadId) {
  try {
    const data = JSON.parse(localStorage.getItem(UNREAD_KEY) || '{}');
    if (data[threadId]) {
      delete data[threadId];
      localStorage.setItem(UNREAD_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event('inkwell_unread_changed'));
    }
  } catch {}
}

export function addUnread(threadId) {
  try {
    const data = JSON.parse(localStorage.getItem(UNREAD_KEY) || '{}');
    data[threadId] = (data[threadId] || 0) + 1;
    localStorage.setItem(UNREAD_KEY, JSON.stringify(data));
    // Dispatch custom event for real-time UI updates
    window.dispatchEvent(new Event('inkwell_unread_changed'));
  } catch {}
}
