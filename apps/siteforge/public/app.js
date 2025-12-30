const API_BASE = '';

let projects = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadProjects();
});

function setupEventListeners() {
  document.getElementById('projectForm').addEventListener('submit', handleAddProject);

  // Close modal on outside click
  document.getElementById('projectModal').addEventListener('click', (e) => {
    if (e.target.id === 'projectModal') {
      closeModal();
    }
  });
}

async function loadProjects() {
  try {
    const response = await fetch(`${API_BASE}/projects`);
    const data = await response.json();
    projects = data.projects || [];
    renderProjects();
    updateStats();
  } catch (error) {
    console.error('Error loading projects:', error);
    showError('Failed to load projects');
  }
}

function renderProjects() {
  const container = document.getElementById('projectsContainer');

  if (projects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏗️</div>
        <h3>No projects yet</h3>
        <p>Create your first website project to get started</p>
      </div>
    `;
    return;
  }

  const html = `
    <div class="projects-grid">
      ${projects.map(project => renderProject(project)).join('')}
    </div>
  `;
  container.innerHTML = html;
}

function renderProject(project) {
  return `
    <div class="project-card">
      <div class="project-header">
        <div class="project-business">${escapeHtml(project.businessName)}</div>
        <div class="project-domain">🌐 ${escapeHtml(project.domain)}</div>
      </div>
      <div class="project-meta">
        <span class="badge badge-${project.status}">${formatStatus(project.status)}</span>
        <span class="project-niche">${escapeHtml(project.niche)}</span>
      </div>
      ${project.notes ? `<div class="project-notes">${escapeHtml(project.notes)}</div>` : ''}
      <div class="project-actions">
        ${project.status === 'draft' ? `
          <button class="btn btn-primary btn-small" onclick="generateSite('${project.id}')">
            ⚡ Generate Website
          </button>
        ` : ''}
        ${project.status === 'complete' ? `
          <button class="btn btn-primary btn-small" onclick="viewSite('${project.id}')">
            👁️ View Site
          </button>
        ` : ''}
      </div>
      <div class="project-date">
        Created: ${formatDate(project.createdAt)}
      </div>
    </div>
  `;
}

function updateStats() {
  const totalProjects = projects.length;
  const inProgress = projects.filter(p => p.status === 'queued' || p.status === 'generating').length;
  const completed = projects.filter(p => p.status === 'complete').length;

  document.getElementById('totalProjects').textContent = totalProjects;
  document.getElementById('inProgress').textContent = inProgress;
  document.getElementById('completed').textContent = completed;
}

function openAddModal() {
  document.getElementById('projectModal').classList.add('active');
  document.getElementById('projectForm').reset();
}

function closeModal() {
  document.getElementById('projectModal').classList.remove('active');
}

async function handleAddProject(e) {
  e.preventDefault();

  const projectData = {
    businessName: document.getElementById('businessName').value.trim(),
    domain: document.getElementById('domain').value.trim(),
    niche: document.getElementById('niche').value.trim(),
    notes: document.getElementById('notes').value.trim() || undefined
  };

  try {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });

    if (!response.ok) {
      throw new Error('Failed to create project');
    }

    const data = await response.json();
    projects.unshift(data.project);
    closeModal();
    renderProjects();
    updateStats();
  } catch (error) {
    console.error('Error creating project:', error);
    showError('Failed to create project');
  }
}

async function generateSite(projectId) {
  if (!confirm('Start website generation for this project? This may take a few minutes.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/projects/${projectId}/generate`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to start generation');
    }

    const data = await response.json();
    alert('Website generation started! Job ID: ' + data.job.id);

    // Reload to show updated status
    await loadProjects();
  } catch (error) {
    console.error('Error generating site:', error);
    showError('Failed to start website generation');
  }
}

function viewSite(projectId) {
  alert('Site preview functionality coming soon!');
}

function formatStatus(status) {
  const statusMap = {
    draft: 'Draft',
    queued: 'Queued',
    generating: 'Generating',
    complete: 'Complete',
    failed: 'Failed'
  };
  return statusMap[status] || status;
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
