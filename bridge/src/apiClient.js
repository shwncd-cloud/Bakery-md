/// Thin client for the two endpoints the bridge needs, plus login and
/// automatic re-auth on token expiry (JWT_EXPIRES_IN on the backend, 12h
/// by default - this runs unattended for much longer than that).
export class ApiClient {
  constructor(baseUrl, nationalId, password) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.nationalId = nationalId;
    this.password = password;
    this.token = null;
  }

  async login() {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nationalId: this.nationalId, password: this.password }),
    });
    if (!response.ok) {
      throw new Error(`Login failed: HTTP ${response.status}`);
    }
    const body = await response.json();
    this.token = body.accessToken;
  }

  async request(method, path) {
    if (!this.token) await this.login();

    let response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (response.status === 401) {
      // Token expired or invalid - log in again and retry once.
      await this.login();
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.token}` },
      });
    }

    if (!response.ok) {
      throw new Error(`${method} ${path} failed: HTTP ${response.status}`);
    }
    if (response.status === 204) return undefined;
    return response.json();
  }

  getPendingTickets() {
    return this.request('GET', '/kitchen-tickets/pending');
  }

  markPrinted(ticketId) {
    return this.request('POST', `/kitchen-tickets/${ticketId}/mark-printed`);
  }
}
