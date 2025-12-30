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

  // Intelligence insights
  const intelligence = lead.intelligence;
  const hasIntelligence = intelligence && intelligence.qualificationLevel;

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
        ${hasIntelligence ? renderIntelligenceBadges(intelligence) : ''}
      </div>
      ${lead.notes ? `<div class="lead-notes">${escapeHtml(lead.notes)}</div>` : ''}
      ${lead.scoringBreakdown ? renderScoringBreakdown(lead.scoringBreakdown) : ''}
      ${hasIntelligence ? renderIntelligenceInsights(intelligence) : ''}
      <div class="lead-actions">
        ${!hasIntelligence ? `
          <button class="btn-action" onclick="enrichLead('${lead.id}')">
            🤖 Enrich with AI
          </button>
        ` : `
          <button class="btn-action" onclick="refreshIntelligence('${lead.id}')">
            🔄 Refresh Intelligence
          </button>
        `}
        <button class="btn-action" onclick="recalculateScore('${lead.id}')">
          📊 Recalculate Score
        </button>
      </div>
      <div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
        Added: ${formatDate(lead.createdAt)}
        ${hasIntelligence ? `• Analyzed: ${formatDate(intelligence.analyzedAt)}` : ''}
      </div>
    </div>
  `;
}

function renderIntelligenceBadges(intelligence) {
  const qualColors = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#ef4444'
  };

  return `
    <span class="badge" style="background: ${qualColors[intelligence.qualificationLevel]}; color: white;">
      ${intelligence.qualificationLevel.toUpperCase()} Qualification
    </span>
    ${intelligence.companySize && intelligence.companySize !== 'unknown' ? `
      <span class="badge" style="background: #6366f1; color: white;">
        ${intelligence.companySize}
      </span>
    ` : ''}
  `;
}

function renderIntelligenceInsights(intelligence) {
  return `
    <div class="intelligence-panel">
      <div class="intelligence-header">
        <strong>AI Insights</strong>
        <span style="font-size: 11px; color: #6b7280;">Confidence: ${intelligence.confidence}%</span>
      </div>
      <div class="intelligence-reason">
        ${escapeHtml(intelligence.qualificationReason)}
      </div>
      ${intelligence.keyInsights && intelligence.keyInsights.length > 0 ? `
        <div class="intelligence-insights">
          ${intelligence.keyInsights.slice(0, 3).map(insight => `
            <div class="insight-item">💡 ${escapeHtml(insight)}</div>
          `).join('')}
        </div>
      ` : ''}
      ${intelligence.opportunities && intelligence.opportunities.length > 0 ? `
        <div class="intelligence-opportunities">
          <strong style="font-size: 12px; color: #10b981;">Opportunities:</strong>
          ${intelligence.opportunities.slice(0, 2).map(opp => `
            <div class="insight-item">✨ ${escapeHtml(opp)}</div>
          `).join('')}
        </div>
      ` : ''}
      ${intelligence.riskFactors && intelligence.riskFactors.length > 0 ? `
        <div class="intelligence-risks">
          <strong style="font-size: 12px; color: #ef4444;">Risk Factors:</strong>
          ${intelligence.riskFactors.slice(0, 2).map(risk => `
            <div class="insight-item">⚠️ ${escapeHtml(risk)}</div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderScoringBreakdown(breakdown) {
  if (!breakdown) return '';

  return `
    <div class="scoring-breakdown">
      <div class="breakdown-header">
        <strong>📊 Score Breakdown</strong>
        <span style="font-size: 13px; font-weight: 600; color: #3b82f6;">${Math.round(breakdown.totalScore)}</span>
      </div>
      <div class="breakdown-factors">
        <div class="breakdown-factor">
          <span class="factor-label">Source Quality</span>
          <div class="factor-bar-container">
            <div class="factor-bar" style="width: ${breakdown.factors.source.contribution}%; background: #8b5cf6;"></div>
          </div>
          <span class="factor-value">+${Math.round(breakdown.factors.source.contribution)}</span>
        </div>
        <div class="breakdown-factor">
          <span class="factor-label">Recency</span>
          <div class="factor-bar-container">
            <div class="factor-bar" style="width: ${breakdown.factors.recency.contribution}%; background: #06b6d4;"></div>
          </div>
          <span class="factor-value">+${Math.round(breakdown.factors.recency.contribution)}</span>
        </div>
        <div class="breakdown-factor">
          <span class="factor-label">URL Quality</span>
          <div class="factor-bar-container">
            <div class="factor-bar" style="width: ${breakdown.factors.urlQuality.contribution}%; background: #10b981;"></div>
          </div>
          <span class="factor-value">+${Math.round(breakdown.factors.urlQuality.contribution)}</span>
        </div>
        <div class="breakdown-factor">
          <span class="factor-label">Company Name</span>
          <div class="factor-bar-container">
            <div class="factor-bar" style="width: ${breakdown.factors.companyName.contribution}%; background: #f59e0b;"></div>
          </div>
          <span class="factor-value">${breakdown.factors.companyName.hasName ? `+${Math.round(breakdown.factors.companyName.contribution)}` : '0'}</span>
        </div>
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

// Enrich lead with AI intelligence
async function enrichLead(leadId) {
  try {
    const button = event.target;
    button.disabled = true;
    button.textContent = '🔄 Enriching...';

    const response = await fetch(`${API_BASE}/leads/${leadId}/enrich`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to enrich lead');
    }

    const data = await response.json();

    // Update the lead in our local array
    const index = leads.findIndex(l => l.id === leadId);
    if (index !== -1) {
      leads[index] = data.lead;
    }

    applyFilters();
    updateStats();
  } catch (error) {
    console.error('Error enriching lead:', error);
    showError('Failed to enrich lead. Make sure OPENAI_API_KEY is set.');
  }
}

// Refresh intelligence for a lead
async function refreshIntelligence(leadId) {
  await enrichLead(leadId);
}

// Recalculate score for a lead
async function recalculateScore(leadId) {
  try {
    const button = event.target;
    button.disabled = true;
    button.textContent = '🔄 Calculating...';

    const response = await fetch(`${API_BASE}/leads/${leadId}/score`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to recalculate score');
    }

    const data = await response.json();

    // Update the lead in our local array with scoring breakdown
    const index = leads.findIndex(l => l.id === leadId);
    if (index !== -1) {
      leads[index] = {
        ...data.lead,
        scoringBreakdown: data.breakdown  // Store breakdown for display
      };
    }

    applyFilters();
    updateStats();
  } catch (error) {
    console.error('Error recalculating score:', error);
    showError('Failed to recalculate score');
  }
}
