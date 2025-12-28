// Console client-side app
const API_BASE = '/api';
let currentView = 'dashboard';

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
    if (view === 'dashboard') {
      await renderDashboard();
    } else if (view === 'quests') {
      await renderQuests();
    } else if (view === 'team') {
      await renderTeam();
    } else if (view === 'health') {
      await renderHealth();
    } else if (view === 'apps') {
      await renderApps();
    } else if (view === 'activity') {
      await renderActivity();
    } else if (view === 'telemetry') {
      await renderTelemetry();
    }
  } catch (error) {
    app.innerHTML = `<div class="card"><p style="color: red;">Error: ${error.message}</p></div>`;
  }
}

async function renderDashboard() {
  const [statsRes, teamRes, healthRes, eventsRes] = await Promise.all([
    fetch(`${API_BASE}/dashboard/stats`),
    fetch(`${API_BASE}/team`),
    fetch(`${API_BASE}/health`),
    fetch(`${API_BASE}/events`)
  ]);

  const stats = await statsRes.json();
  const team = await teamRes.json();
  const health = await healthRes.json();
  const events = await eventsRes.json();

  const onlineApps = health.filter(h => h.status === 'online').length;
  const recentEvents = events.slice(0, 5).reverse();

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="metric-label">Team Members</div>
        <div class="metric-value">${team.length}</div>
      </div>
      <div class="stat-card">
        <div class="metric-label">Apps Online</div>
        <div class="metric-value">${onlineApps}/${health.length}</div>
      </div>
      <div class="stat-card">
        <div class="metric-label">Events (1h)</div>
        <div class="metric-value">${stats.recentEventsCount}</div>
      </div>
      <div class="stat-card">
        <div class="metric-label">AI Calls</div>
        <div class="metric-value">${stats.totalAICalls}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Quick Actions</h2>
        <div class="grid" style="margin-top: 20px;">
          <div class="quick-action" onclick="showView('team')">
            <div class="quick-action-icon">👥</div>
            <div class="quick-action-label">View Team</div>
          </div>
          <div class="quick-action" onclick="showView('health')">
            <div class="quick-action-icon">💚</div>
            <div class="quick-action-label">System Health</div>
          </div>
          <div class="quick-action" onclick="showView('activity')">
            <div class="quick-action-icon">📊</div>
            <div class="quick-action-label">Activity Feed</div>
          </div>
          <div class="quick-action" onclick="showView('telemetry')">
            <div class="quick-action-icon">📈</div>
            <div class="quick-action-label">Telemetry</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Recent Activity</h2>
        ${recentEvents.length === 0 ? '<p style="margin-top: 10px; color: #666;">No recent events</p>' :
          recentEvents.map(event => `
            <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
              <div style="font-weight: 600; color: #667eea; font-size: 13px;">${event.type}</div>
              <div style="font-size: 11px; color: #999; margin-top: 3px;">
                ${event.sourceApp} • ${new Date(event.createdAt).toLocaleTimeString()}
              </div>
            </div>
          `).join('')
        }
        <div style="margin-top: 15px;">
          <a href="#" onclick="showView('activity'); return false;" style="color: #667eea; font-size: 14px; font-weight: 600;">View all activity →</a>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Team Overview</h2>
      ${team.map(member => {
        const workloadPercent = (member.currentWorkloadMinutes / member.dailyCapacityMinutes * 100).toFixed(0);
        const isOverloaded = workloadPercent > 100;
        return `
          <div class="team-member">
            <div class="member-header">
              <div class="member-avatar">${member.avatar || '👤'}</div>
              <div class="member-info" style="flex: 1;">
                <h3>${member.name}</h3>
                <p>${member.email} • ${member.role}</p>
                <div style="margin-top: 8px;">
                  <span style="font-size: 12px; color: #666;">
                    Workload: ${member.currentWorkloadMinutes || 0} / ${member.dailyCapacityMinutes} min (${workloadPercent}%)
                    ${isOverloaded ? '<span style="color: #d32f2f; font-weight: bold;">⚠️ Overloaded</span>' : ''}
                  </span>
                </div>
                <div class="workload-bar">
                  <div class="workload-fill" style="width: ${Math.min(workloadPercent, 100)}%; ${isOverloaded ? 'background: linear-gradient(90deg, #ef5350 0%, #d32f2f 100%);' : ''}"></div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
      <div style="margin-top: 15px;">
        <a href="#" onclick="showView('team'); return false;" style="color: #667eea; font-size: 14px; font-weight: 600;">View full team details →</a>
      </div>
    </div>
  `;
}

async function renderTeam() {
  const res = await fetch(`${API_BASE}/team`);
  const team = await res.json();

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="card">
      <h2>Team Members</h2>
      <p style="margin: 10px 0; color: #666;">Total: ${team.length} members</p>
    </div>
    ${team.map(member => {
      const workloadPercent = (member.currentWorkloadMinutes / member.dailyCapacityMinutes * 100).toFixed(0);
      const isOverloaded = workloadPercent > 100;
      return `
        <div class="card">
          <div class="member-header">
            <div class="member-avatar">${member.avatar || '👤'}</div>
            <div class="member-info" style="flex: 1;">
              <h3>${member.name}</h3>
              <p>${member.email}</p>
              <p style="margin-top: 5px;"><strong>Role:</strong> ${member.role}</p>
            </div>
          </div>

          ${member.workingGeniusProfile ? `
            <div style="margin-top: 15px;">
              <h4 style="margin-bottom: 10px;">Working Genius Profile</h4>
              <div class="genius-badges">
                <span style="font-size: 12px; color: #666; width: 100%; margin-bottom: 5px;">Top 2 Geniuses:</span>
                ${member.workingGeniusProfile.top2.map(g =>
                  `<span class="genius-badge genius-top">✨ ${g}</span>`
                ).join('')}
              </div>
              <div class="genius-badges">
                <span style="font-size: 12px; color: #666; width: 100%; margin-bottom: 5px;">Competency:</span>
                ${member.workingGeniusProfile.competency2.map(g =>
                  `<span class="genius-badge genius-competency">⚡ ${g}</span>`
                ).join('')}
              </div>
              <div class="genius-badges">
                <span style="font-size: 12px; color: #666; width: 100%; margin-bottom: 5px;">Frustration:</span>
                ${member.workingGeniusProfile.frustration2.map(g =>
                  `<span class="genius-badge genius-frustration">⚠️ ${g}</span>`
                ).join('')}
              </div>
            </div>
          ` : ''}

          <div style="margin-top: 15px;">
            <h4>Current Workload</h4>
            <p style="margin: 10px 0; font-size: 14px; color: #666;">
              ${member.currentWorkloadMinutes || 0} / ${member.dailyCapacityMinutes} minutes (${workloadPercent}%)
              ${isOverloaded ? '<span style="color: #d32f2f; font-weight: bold; margin-left: 10px;">⚠️ Overloaded</span>' : ''}
            </p>
            <div class="workload-bar">
              <div class="workload-fill" style="width: ${Math.min(workloadPercent, 100)}%; ${isOverloaded ? 'background: linear-gradient(90deg, #ef5350 0%, #d32f2f 100%);' : ''}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

async function renderHealth() {
  const res = await fetch(`${API_BASE}/health`);
  const health = await res.json();

  const onlineCount = health.filter(h => h.status === 'online').length;
  const offlineCount = health.filter(h => h.status === 'offline').length;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="card">
      <h2>System Health</h2>
      <p style="margin: 10px 0; color: #666;">
        ${onlineCount} online • ${offlineCount} offline
      </p>
    </div>
    <div class="grid">
      ${health.map(h => `
        <div class="card">
          <h3>
            ${h.name}
            <span class="status ${h.status}">${h.status}</span>
          </h3>
          <p style="margin-top: 10px; color: #666;">
            <strong>ID:</strong> ${h.id}<br>
            <strong>Port:</strong> ${h.port}<br>
            <strong>Last checked:</strong> ${new Date(h.lastChecked).toLocaleTimeString()}
          </p>
          ${h.status === 'online' ?
            `<a href="http://localhost:${h.port}" target="_blank" style="display: inline-block; margin-top: 10px; color: #667eea; font-size: 14px; font-weight: 600;">Open app →</a>`
            : '<p style="margin-top: 10px; color: #d32f2f; font-size: 14px;">App is not running</p>'}
        </div>
      `).join('')}
    </div>
  `;
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

async function renderActivity() {
  const res = await fetch(`${API_BASE}/events`);
  const events = await res.json();

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="card">
      <h2>Activity Timeline</h2>
      <p style="margin: 10px 0; color: #666;">Showing last ${events.length} events across all apps</p>
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

async function renderQuests() {
  const res = await fetch(`${API_BASE}/quests/active`);
  const data = await res.json();

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="metric-label">Total Questlines</div>
        <div class="metric-value">${data.totalQuestlines}</div>
      </div>
      <div class="stat-card">
        <div class="metric-label">Active Quests</div>
        <div class="metric-value">${data.activeQuests}</div>
      </div>
      <div class="stat-card">
        <div class="metric-label">Completed Quests</div>
        <div class="metric-value">${data.completedQuests}</div>
      </div>
      <div class="stat-card">
        <div class="metric-label">Overall Progress</div>
        <div class="metric-value">
          ${data.questlines.reduce((sum, ql) => sum + ql.completedTasks, 0)}/${data.questlines.reduce((sum, ql) => sum + ql.totalTasks, 0)}
        </div>
      </div>
    </div>

    ${data.questlines.length === 0 ? `
      <div class="card" style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 64px; margin-bottom: 20px;">🎮</div>
        <h2 style="margin-bottom: 12px;">No Active Questlines</h2>
        <p style="color: #666; margin-bottom: 20px;">Create a goal in Questboard to get started!</p>
        <a href="http://localhost:3000/goals" target="_blank"
           style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Open Questboard →
        </a>
      </div>
    ` : data.questlines.map(ql => {
      const activeQuests = ql.quests.filter(q => q.state === 'unlocked' || q.state === 'in-progress');
      return `
        <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
            <div>
              <h2 style="color: white; margin-bottom: 8px;">${ql.title}</h2>
              ${ql.epic ? `<p style="opacity: 0.9; font-style: italic; margin-bottom: 8px;">📜 ${ql.epic}</p>` : ''}
              ${ql.description ? `<p style="opacity: 0.8; font-size: 14px;">${ql.description}</p>` : ''}
            </div>
            <div style="text-align: right;">
              <div style="font-size: 32px; font-weight: bold;">${ql.progress}%</div>
              <div style="font-size: 12px; opacity: 0.9;">${ql.completedTasks}/${ql.totalTasks} tasks</div>
            </div>
          </div>

          ${ql.owner ? `
            <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 10px; margin-bottom: 16px;">
              <strong style="font-size: 13px;">👤 Quest Leader: ${ql.owner}</strong>
              ${ql.assignmentReason ? `<div style="opacity: 0.8; font-size: 12px; margin-top: 4px;">${ql.assignmentReason}</div>` : ''}
            </div>
          ` : ''}

          <div style="background: rgba(255,255,255,0.1); border-radius: 12px; height: 24px; overflow: hidden; position: relative; margin-bottom: 20px;">
            <div style="background: linear-gradient(90deg, #4CAF50, #8BC34A); height: 100%; width: ${ql.progress}%; transition: width 0.5s;"></div>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 12px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              ${ql.progress}% Complete
            </div>
          </div>

          <div>
            <h3 style="color: white; font-size: 16px; margin-bottom: 12px;">🗺️ Quest Chain (${ql.quests.length} quests)</h3>
            ${ql.quests.map(quest => {
              const stateColors = {
                locked: '#999',
                unlocked: '#FFA500',
                'in-progress': '#2196F3',
                completed: '#4CAF50'
              };
              const stateIcons = {
                locked: '🔒',
                unlocked: '⚡',
                'in-progress': '⚔️',
                completed: '✅'
              };
              const stateLabels = {
                locked: 'Locked',
                unlocked: 'Ready',
                'in-progress': 'In Progress',
                completed: 'Complete'
              };
              return `
                <div style="background: rgba(255,255,255,0.1); border: 2px solid ${stateColors[quest.state]}; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: ${stateColors[quest.state]}; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                    ${stateIcons[quest.state]}
                  </div>
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                      <span style="font-weight: bold; font-size: 15px;">${quest.title}</span>
                      <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: ${stateColors[quest.state]}; font-weight: bold;">
                        ${stateLabels[quest.state]}
                      </span>
                    </div>
                    ${quest.totalTasks > 0 ? `
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; background: rgba(255,255,255,0.2); border-radius: 4px; height: 6px; overflow: hidden;">
                          <div style="background: #4CAF50; height: 100%; width: ${quest.progress}%;"></div>
                        </div>
                        <span style="font-size: 12px; opacity: 0.9;">${quest.completedTasks}/${quest.totalTasks}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}
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
showView('dashboard');

window.showView = showView;

