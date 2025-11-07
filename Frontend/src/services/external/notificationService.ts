const API_BASE = '/api/v1/notifications';

export const notificationService = {
  async getPreferences() {
    const response = await fetch(`${API_BASE}/preferences`);
    if (!response.ok) throw new Error('Failed to fetch preferences');
    const data = await response.json();
    return data.data;
  },

  async updatePreferences(prefs: any) {
    const response = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    if (!response.ok) throw new Error('Failed to update preferences');
    return await response.json();
  },

  async getHistory(page = 1) {
    const response = await fetch(`${API_BASE}/history?page=${page}`);
    if (!response.ok) throw new Error('Failed to fetch history');
    const data = await response.json();
    return data.data;
  },

  async sendTestEmail() {
    const response = await fetch(`${API_BASE}/test`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to send test email');
    return await response.json();
  }
};