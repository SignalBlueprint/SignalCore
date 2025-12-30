const API_BASE = '';
const ORG_ID = 'org-demo';

let leads = [];
let filteredLeads = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadLeads();
});

function setupEventListeners() {
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('filterSource').addEventListener('change', applyFilters);
  document.getElementById('filterMinScore').addEventListener('input', applyFilters);
  document.getElementById('leadForm').addEventListener('submit', handleAddLead);

  // Close modal on outside click
  document.getElementById('leadModal').addEventListener('click', (e) => {
    if (e.target.id === 'leadModal') {
      closeModal();
    }
  });
}

async function loadLeads() {
  try {
    const response = await fetch(`${API_BASE}/leads`);
    const data = await response.json();
    leads = data.leads || [];
    applyFilters();
    updateStats();
  } catch (error) {
    console.error('Error loading leads:', error);
    showError('Failed to load leads');
  }
}

function applyFilters() {
  const status = document.getElementById('filterStatus').value;
  const source = document.getElementById('filterSource').value;
  const minScore = parseInt(document.getElementById('filterMinScore').value) || 0;

  filteredLeads = leads.filter(lead => {
    if (status && lead.status !== status) return false;
    if (source && lead.source !== source) return false;
    if (minScore && (lead.score || 0) < minScore) return false;
    return true;
  });

  renderLeads();
}

function renderLeads() {
  const container = document.getElementById('leadsContainer');

  if (filteredLeads.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No leads found</h3>
        <p>Try adjusting your filters or add a new lead</p>
      </div>
    `;
    return;
  }

  const html = `
    <div class="leads-grid">
      ${filteredLeads.map(lead => renderLead(lead)).join('')}
    </div>
  `;
  container.innerHTML = html;
}

function renderLead(lead) {
  const statusColors = {
    new: '#dbeafe',
    contacted: '#fef3c7',
    qualified: '#d1fae5',
    rejected: '#fee2e2'
  };

  const scoreColor = lead.score >= 80 ? '#10b981' : lead.score >= 60 ? '#f59e0b' : '#6b7280';

  return `
    <div class="lead-card" style="border-left-color: ${statusColors[lead.status] || '#3b82f6'}">
      <div class="lead-header">
        <div>
          <div class="lead-company">${escapeHtml(lead.companyName || 'Unknown Company')}</div>
          <a href="${escapeHtml(lead.url)}" target="_blank" class="lead-url">${escapeHtml(lead.url)}</a>
        </div>
        ${lead.score ? `<div class="lead-score" style="background: ${scoreColor}">${lead.score}</div>` : ''}
      </div>
      <div class="lead-meta">
        <span class="badge badge-status">${formatStatus(lead.status)}</span>
        <span class="badge badge-source">${formatSource(lead.source)}</span>
      </div>
      ${lead.notes ? `<div class="lead-notes">${escapeHtml(lead.notes)}</div>` : ''}
      <div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
        Added: ${formatDate(lead.createdAt)}
      </div>
    </div>
  `;
}

function updateStats() {
  const totalLeads = leads.length;
  const avgScore = leads.length > 0
    ? Math.round(leads.reduce((sum, lead) => sum + (lead.score || 0), 0) / leads.length)
    : 0;

  document.getElementById('totalLeads').textContent = totalLeads;
  document.getElementById('avgScore').textContent = avgScore;
}

function openAddModal() {
  document.getElementById('leadModal').classList.add('active');
  document.getElementById('leadForm').reset();
}

function closeModal() {
  document.getElementById('leadModal').classList.remove('active');
}

async function handleAddLead(e) {
  e.preventDefault();

  const leadData = {
    orgId: ORG_ID,
    companyName: document.getElementById('companyName').value.trim(),
    url: document.getElementById('url').value.trim(),
    source: document.getElementById('source').value,
    score: parseInt(document.getElementById('score').value) || undefined,
    notes: document.getElementById('notes').value.trim() || undefined
  };

  try {
    const response = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    if (!response.ok) {
      throw new Error('Failed to create lead');
    }

    const data = await response.json();
    leads.unshift(data.lead);
    closeModal();
    applyFilters();
    updateStats();
  } catch (error) {
    console.error('Error creating lead:', error);
    showError('Failed to create lead');
  }
}

function formatStatus(status) {
  const statusMap = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    rejected: 'Rejected'
  };
  return statusMap[status] || status;
}

function formatSource(source) {
  const sourceMap = {
    manual: '✍️ Manual',
    scrape: '🕷️ Scrape',
    referral: '👥 Referral',
    import: '📥 Import'
  };
  return sourceMap[source] || source;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  alert(message);
}
