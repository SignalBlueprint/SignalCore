// Console client-side app
const API_BASE = '/api';
let currentView = 'apps';

function setActiveNav(view) {
  document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
  document.getElementById(`nav-${view}`).classList.add('active');
}

async function showView(view) {
  currentView = view;
  setActiveNav(view);
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading">Loading...</div>';

  try {
    if (view === 'apps') {
      await renderApps();
    } else if (view === 'events') {
      await renderEvents();
    } else if (view === 'telemetry') {
      await renderTelemetry();
    }
  } catch (error) {
    app.innerHTML = `<div class="card"><p style="color: red;">Error: ${error.message}</p></div>`;
  }
}

async function renderApps() {
  const res = await fetch(`${API_BASE}/apps`);
  const apps = await res.json();
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="card">
      <h2>Suite Apps</h2>
      <p style="margin: 10px 0; color: #666;">Total: ${apps.length} apps</p>
    </div>
    ${apps.map(app => `
      <div class="card app-item">
        <h3>
          ${app.title}
          <span class="status ${app.status}">${app.status}</span>
        </h3>
        <p><strong>ID:</strong> ${app.id}</p>
        <p style="margin-top: 10px;">${app.purpose}</p>
      </div>
    `).join('')}
  `;
}

async function renderEvents() {
  const res = await fetch(`${API_BASE}/events`);
  const events = await res.json();
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="card">
      <h2>Latest Events</h2>
      <p style="margin: 10px 0; color: #666;">Showing last ${events.length} events</p>
    </div>
    ${events.length === 0 ? '<div class="card"><p>No events found</p></div>' : events.reverse().map(event => `
      <div class="card event-item">
        <div>
          <span class="event-type">${event.type}</span>
          <span class="event-time" style="float: right;">${new Date(event.createdAt).toLocaleString()}</span>
        </div>
        <div style="margin-top: 5px; color: #666; font-size: 11px;">
          Source: ${event.sourceApp} | ID: ${event.id}
        </div>
        <pre style="margin-top: 10px;">${JSON.stringify(event.payload, null, 2)}</pre>
      </div>
    `).join('')}
  `;
}

async function renderTelemetry() {
  const res = await fetch(`${API_BASE}/telemetry`);
  const state = await res.json();
  
  const cacheHitRate = state.totalCalls > 0 
    ? ((state.cachedCalls / state.totalCalls) * 100).toFixed(1)
    : 0;
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="card">
      <h2>Telemetry & AI Costs</h2>
      <div style="margin-top: 20px;">
        <div class="metric">
          <div class="metric-label">Total AI Calls</div>
          <div class="metric-value">${state.totalCalls}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Cached Calls</div>
          <div class="metric-value">${state.cachedCalls}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Fresh Calls</div>
          <div class="metric-value">${state.totalCalls - state.cachedCalls}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Cache Hit Rate</div>
          <div class="metric-value">${cacheHitRate}%</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Tokens</div>
          <div class="metric-value">${state.totalTokens.toLocaleString()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Cost</div>
          <div class="metric-value">$${state.totalCost.toFixed(4)}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <h3>Notes</h3>
      <ul style="margin-top: 10px; padding-left: 20px; color: #666;">
        <li>Cache hit rate shows percentage of AI calls served from cache (costs $0)</li>
        <li>Total cost is cumulative across all AI operations</li>
        <li>Telemetry state resets when server restarts</li>
      </ul>
    </div>
  `;
}

// Initialize
showView('apps');

window.showView = showView;

