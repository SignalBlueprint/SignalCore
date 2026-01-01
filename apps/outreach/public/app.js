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
  document.getElementById('sendModal').addEventListener('click', (e) => {
    if (e.target.id === 'sendModal') {
      closeSendModal();
    }
  });
  document.getElementById('sendResultsModal').addEventListener('click', (e) => {
    if (e.target.id === 'sendResultsModal') {
      closeSendResultsModal();
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

  // Campaign stats
  const sentCount = campaign.sentCount || 0;
  const failedCount = campaign.failedCount || 0;
  const statsHtml = (sentCount > 0 || failedCount > 0) ? `
    <div class="campaign-stats" style="font-size: 13px; color: #6b7280; margin-bottom: 10px;">
      📊 Sent: ${sentCount} | Failed: ${failedCount}
      ${campaign.lastSentAt ? `| Last sent: ${formatDate(campaign.lastSentAt)}` : ''}
    </div>
  ` : '';

  return `
    <div class="campaign-card">
      <div class="campaign-name">${escapeHtml(campaign.name)}</div>
      <div class="campaign-filters">🎯 ${filterText}</div>
      ${statsHtml}
      <div class="campaign-template">
        <div class="template-subject">Subject: ${escapeHtml(campaign.template.subject)}</div>
        <div class="template-body">${escapeHtml(campaign.template.body).substring(0, 150)}${campaign.template.body.length > 150 ? '...' : ''}</div>
      </div>
      <div class="campaign-actions">
        <button class="btn btn-primary btn-small" onclick="previewMessages('${campaign.id}')">
          👁️ Preview Messages
        </button>
        <button class="btn btn-primary btn-small" onclick="openSendModal('${campaign.id}')" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          🚀 Send Campaign
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

// Send Campaign functionality
let currentSendCampaignId = null;

async function openSendModal(campaignId) {
  currentSendCampaignId = campaignId;
  const campaign = campaigns.find(c => c.id === campaignId);

  if (!campaign) {
    showError('Campaign not found');
    return;
  }

  // Show the modal
  document.getElementById('sendModal').classList.add('active');
  document.getElementById('sendCampaignName').textContent = campaign.name;
  document.getElementById('sendRecipientCount').textContent = 'Calculating...';

  // Fetch recipient count by compiling the campaign
  try {
    const response = await fetch(`${API_BASE}/campaigns/${campaignId}/compile`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to get recipient count');
    }

    const data = await response.json();
    const recipientCount = (data.messages || []).length;
    document.getElementById('sendRecipientCount').textContent = `${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`;

    // Disable send button if no recipients
    const sendBtn = document.getElementById('confirmSendBtn');
    if (recipientCount === 0) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'No Recipients';
      document.getElementById('sendRecipientCount').innerHTML = '<span style="color: #ef4444;">0 recipients (no leads match filters)</span>';
    } else {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Campaign';
    }
  } catch (error) {
    console.error('Error getting recipient count:', error);
    document.getElementById('sendRecipientCount').textContent = 'Unknown';
  }
}

function closeSendModal() {
  document.getElementById('sendModal').classList.remove('active');
  currentSendCampaignId = null;
}

async function confirmSendCampaign() {
  if (!currentSendCampaignId) return;

  // Close send modal
  closeSendModal();

  // Show progress modal
  document.getElementById('sendProgressModal').classList.add('active');

  try {
    const response = await fetch(`${API_BASE}/campaigns/${currentSendCampaignId}/send`, {
      method: 'POST'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to send campaign');
    }

    const data = await response.json();

    // Close progress modal
    document.getElementById('sendProgressModal').classList.remove('active');

    // Show results
    showSendResults(data);

    // Reload campaigns to get updated stats
    await loadCampaigns();

  } catch (error) {
    console.error('Error sending campaign:', error);

    // Close progress modal
    document.getElementById('sendProgressModal').classList.remove('active');

    // Show error results
    showSendResults({
      success: false,
      error: error.message,
      sent: 0,
      failed: 0
    });
  }

  currentSendCampaignId = null;
}

function showSendResults(data) {
  const container = document.getElementById('sendResultsContent');

  if (data.success === false || data.error) {
    // Error state
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 20px;">
        <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
        <div style="font-size: 18px; font-weight: 600; color: #ef4444; margin-bottom: 10px;">
          Failed to Send Campaign
        </div>
        <div style="color: #6b7280; margin-bottom: 20px;">
          ${escapeHtml(data.error || 'An unknown error occurred')}
        </div>
      </div>
    `;
  } else {
    // Success state
    const totalAttempted = (data.sent || 0) + (data.failed || 0);
    const successRate = totalAttempted > 0 ? Math.round((data.sent / totalAttempted) * 100) : 0;

    container.innerHTML = `
      <div style="text-align: center; padding: 30px 20px;">
        <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
        <div style="font-size: 18px; font-weight: 600; color: #10b981; margin-bottom: 20px;">
          Campaign Sent Successfully
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; text-align: left;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">SENT</div>
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${data.sent || 0}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">FAILED</div>
              <div style="font-size: 24px; font-weight: bold; color: ${data.failed > 0 ? '#ef4444' : '#6b7280'};">${data.failed || 0}</div>
            </div>
          </div>

          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">SUCCESS RATE</div>
            <div style="font-size: 20px; font-weight: bold; color: #374151;">${successRate}%</div>
          </div>
        </div>

        ${data.failed > 0 ? `
          <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 15px; font-size: 14px; text-align: left;">
            ⚠️ Some emails failed to send. Check the campaign history for details.
          </div>
        ` : ''}
      </div>
    `;
  }

  document.getElementById('sendResultsModal').classList.add('active');
}

function closeSendResultsModal() {
  document.getElementById('sendResultsModal').classList.remove('active');
}
