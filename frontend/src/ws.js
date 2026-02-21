class WSManager {
  constructor() {
    this.ws = null;
    this.projectListeners = new Map();
    this.statusListeners = new Set();
    this.subscriptions = new Set();
    this.backoff = 500;
    this.reconnectTimer = null;
    this.connect();
  }

  notifyStatus(status) {
    this.statusListeners.forEach((cb) => cb(status));
  }

  getWsUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/ws`;
  }

  connect() {
    const token = localStorage.getItem('lf_token');
    if (!token) return;

    this.notifyStatus('connecting');
    this.ws = new WebSocket(`${this.getWsUrl()}?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => {
      this.backoff = 500;
      this.notifyStatus('connected');
      this.subscriptions.forEach((projectId) => {
        this.ws?.send(JSON.stringify({ type: 'subscribe', projectId }));
      });
    };

    this.ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!data?.projectId) return;
      const listeners = this.projectListeners.get(data.projectId);
      if (listeners) {
        listeners.forEach((cb) => cb(data));
      }
    };

    this.ws.onclose = () => {
      this.notifyStatus('disconnected');
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, 8000);
    };

    this.ws.onerror = () => this.notifyStatus('error');
  }

  onStatus(callback) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  subscribe(projectId, callback) {
    this.subscriptions.add(projectId);
    if (!this.projectListeners.has(projectId)) this.projectListeners.set(projectId, new Set());
    this.projectListeners.get(projectId).add(callback);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', projectId }));
    }
  }

  unsubscribe(projectId, callback) {
    const listeners = this.projectListeners.get(projectId);
    if (listeners && callback) listeners.delete(callback);
    if (listeners && listeners.size === 0) this.projectListeners.delete(projectId);
    if (!this.projectListeners.has(projectId)) this.subscriptions.delete(projectId);
  }
}

export const wsManager = new WSManager();
