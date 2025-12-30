const API_BASE = '';

let campaigns = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadCampaigns();
});

function setupEventListeners() {
  document.getElementById('campaignForm').addEventListener('submit', handleAddCampaign);

  // Close modals on outside click
  document.getElementById('campaignModal').addEventListener('click', (e) => {
    if (e.target.id === 'campaignModal') {
      closeModal();
    }
  });
  document.getElementById('messagesModal').addEventListener('click', (e) => {
    if (e.target.id === 'messagesModal') {
      closeMessagesModal();
    }
  });
}

async function loadCampaigns() {
  try {
    const response = await fetch(`${API_BASE}/campaigns`);
    const data = await response.json();
    campaigns = data.campaigns || [];
    renderCampaigns();
    updateStats();
  } catch (error) {
    console.error('Error loading campaigns:', error);
    showError('Failed to load campaigns');
  }
}

function renderCampaigns() {
  const container = document.getElementById('campaignsContainer');

  if (campaigns.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📨</div>
        <h3>No campaigns yet</h3>
        <p>Create your first outreach campaign to get started</p>
      </div>
    `;
    return;
  }

  const html = `
    <div class="campaigns-grid">
      ${campaigns.map(campaign => renderCampaign(campaign)).join('')}
    </div>
  `;
  container.innerHTML = html;
}

function renderCampaign(campaign) {
  const filters = campaign.audienceFilters || {};
  const filterParts = [];
  if (filters.industry) filterParts.push(`Industry: ${filters.industry}`);
  if (filters.minScore) filterParts.push(`Min Score: ${filters.minScore}`);
  if (filters.maxScore) filterParts.push(`Max Score: ${filters.maxScore}`);
  const filterText = filterParts.length > 0 ? filterParts.join(' | ') : 'All leads';

  return `
    <div class="campaign-card">
      <div class="campaign-name">${escapeHtml(campaign.name)}</div>
      <div class="campaign-filters">🎯 ${filterText}</div>
      <div class="campaign-template">
        <div class="template-subject">Subject: ${escapeHtml(campaign.template.subject)}</div>
        <div class="template-body">${escapeHtml(campaign.template.body).substring(0, 150)}${campaign.template.body.length > 150 ? '...' : ''}</div>
      </div>
      <div class="campaign-actions">
        <button class="btn btn-primary btn-small" onclick="previewMessages('${campaign.id}')">
          👁️ Preview Messages
        </button>
      </div>
      <div class="campaign-date">
        Created: ${formatDate(campaign.createdAt)}
      </div>
    </div>
  `;
}

function updateStats() {
  document.getElementById('totalCampaigns').textContent = campaigns.length;
}

function openAddModal() {
  document.getElementById('campaignModal').classList.add('active');
  document.getElementById('campaignForm').reset();
}

function closeModal() {
  document.getElementById('campaignModal').classList.remove('active');
}

function closeMessagesModal() {
  document.getElementById('messagesModal').classList.remove('active');
}

async function handleAddCampaign(e) {
  e.preventDefault();

  const audienceFilters = {};
  const industry = document.getElementById('industry').value;
  const minScore = parseInt(document.getElementById('minScore').value);
  const maxScore = parseInt(document.getElementById('maxScore').value);

  if (industry) audienceFilters.industry = industry;
  if (!isNaN(minScore)) audienceFilters.minScore = minScore;
  if (!isNaN(maxScore)) audienceFilters.maxScore = maxScore;

  const campaignData = {
    name: document.getElementById('name').value.trim(),
    audienceFilters: Object.keys(audienceFilters).length > 0 ? audienceFilters : undefined,
    template: {
      subject: document.getElementById('subject').value.trim(),
      body: document.getElementById('body').value.trim()
    }
  };

  try {
    const response = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData)
    });

    if (!response.ok) {
      throw new Error('Failed to create campaign');
    }

    const data = await response.json();
    campaigns.unshift(data.campaign);
    closeModal();
    renderCampaigns();
    updateStats();
  } catch (error) {
    console.error('Error creating campaign:', error);
    showError('Failed to create campaign');
  }
}

async function previewMessages(campaignId) {
  document.getElementById('messagesModal').classList.add('active');
  const container = document.getElementById('messagesContainer');
  container.innerHTML = '<div class="loading">Loading messages...</div>';

  try {
    const response = await fetch(`${API_BASE}/campaigns/${campaignId}/compile`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to compile messages');
    }

    const data = await response.json();
    const messages = data.messages || [];

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>No leads match the campaign filters</p>
        </div>
      `;
      return;
    }

    const html = messages.map(message => `
      <div class="message-item">
        <div class="message-subject"><strong>Subject:</strong> ${escapeHtml(message.subject)}</div>
        <div class="message-body">${escapeHtml(message.body)}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div style="margin-bottom: 15px; color: #6b7280;">
        <strong>${messages.length}</strong> message${messages.length !== 1 ? 's' : ''} will be sent
      </div>
      ${html}
    `;
  } catch (error) {
    console.error('Error previewing messages:', error);
    container.innerHTML = '<div class="empty-state"><p>Failed to load messages</p></div>';
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
