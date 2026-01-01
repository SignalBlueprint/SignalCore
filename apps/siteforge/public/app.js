const API_BASE = '';

let projects = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadProjects();
});

function setupEventListeners() {
  document.getElementById('projectForm').addEventListener('submit', handleAddProject);
  document.getElementById('colorsForm').addEventListener('submit', handleUpdateColors);

  // Close modals on outside click
  document.getElementById('projectModal').addEventListener('click', (e) => {
    if (e.target.id === 'projectModal') {
      closeModal();
    }
  });

  document.getElementById('colorsModal').addEventListener('click', (e) => {
    if (e.target.id === 'colorsModal') {
      closeColorsModal();
    }
  });
}

let currentEditingProject = null;

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
  const templateIcon = {
    modern: '✨',
    minimal: '🎯',
    bold: '💥'
  }[project.templateStyle || 'modern'] || '✨';

  const industryIcon = {
    saas: '💻',
    ecommerce: '🛍️',
    portfolio: '🎨',
    general: '📄'
  }[project.industryType || 'general'] || '📄';

  return `
    <div class="project-card">
      <div class="project-header">
        <div class="project-business">${escapeHtml(project.businessName)}</div>
        <div class="project-domain">🌐 ${escapeHtml(project.domain)}</div>
      </div>
      <div class="project-meta">
        <span class="badge badge-${project.status}">${formatStatus(project.status)}</span>
        <span class="project-niche">${escapeHtml(project.niche)}</span>
        ${project.templateStyle ? `<span class="badge" style="background: #ede9fe; color: #5b21b6;">${templateIcon} ${project.templateStyle}</span>` : ''}
        ${project.industryType ? `<span class="badge" style="background: #dbeafe; color: #1e40af;">${industryIcon} ${project.industryType}</span>` : ''}
      </div>
      ${project.notes ? `<div class="project-notes">${escapeHtml(project.notes)}</div>` : ''}
      <div class="project-actions">
        ${project.status === 'draft' ? `
          <button class="btn btn-primary btn-small" onclick="generateSite('${project.id}')">
            ⚡ Generate Website
          </button>
        ` : ''}
        ${project.status === 'ready' ? `
          <button class="btn btn-primary btn-small" onclick="viewSite('${project.id}')">
            👁️ View Site
          </button>
          <button class="btn btn-secondary btn-small" onclick="customizeColors('${project.id}')">
            🎨 Customize
          </button>
          <button class="btn btn-secondary btn-small" onclick="editContent('${project.id}')">
            ✏️ Edit
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
  const completed = projects.filter(p => p.status === 'ready').length;

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

  const templateStyle = document.getElementById('templateStyle').value || undefined;
  const industryType = document.getElementById('industryType').value || undefined;
  const primaryColorInput = document.getElementById('primaryColor');
  const primaryColor = primaryColorInput.value;

  // Only include color scheme if user changed from default
  const colorScheme = (primaryColor && primaryColor !== '#000000') ? { primary: primaryColor } : undefined;

  const projectData = {
    businessName: document.getElementById('businessName').value.trim(),
    domain: document.getElementById('domain').value.trim(),
    niche: document.getElementById('niche').value.trim(),
    notes: document.getElementById('notes').value.trim() || undefined,
    templateStyle,
    industryType,
    colorScheme
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
  const iframe = document.getElementById('previewIframe');
  iframe.src = `/projects/${projectId}/preview`;
  document.getElementById('previewModal').classList.add('active');
  setPreviewDevice('desktop');
}

function closePreview() {
  document.getElementById('previewModal').classList.remove('active');
  document.getElementById('previewIframe').src = '';
}

function setPreviewDevice(device) {
  const iframe = document.getElementById('previewIframe');
  const buttons = document.querySelectorAll('.device-btn');

  // Remove active class from all buttons
  buttons.forEach(btn => btn.classList.remove('active'));

  // Add active class to clicked button
  event.target.classList.add('active');

  // Update iframe class
  iframe.className = `preview-iframe ${device}`;
}

function customizeColors(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  currentEditingProject = project;

  // Load current colors or use defaults
  const colors = project.colorScheme || {};
  document.getElementById('editPrimaryColor').value = colors.primary || '#3b82f6';
  document.getElementById('editSecondaryColor').value = colors.secondary || '#8b5cf6';
  document.getElementById('editAccentColor').value = colors.accent || '#ec4899';

  document.getElementById('colorsModal').classList.add('active');
}

function closeColorsModal() {
  document.getElementById('colorsModal').classList.remove('active');
  currentEditingProject = null;
}

async function handleUpdateColors(e) {
  e.preventDefault();

  if (!currentEditingProject) return;

  const primaryColor = document.getElementById('editPrimaryColor').value;
  const secondaryColor = document.getElementById('editSecondaryColor').value;
  const accentColor = document.getElementById('editAccentColor').value;

  const colorScheme = {
    primary: primaryColor,
    secondary: secondaryColor,
    accent: accentColor
  };

  try {
    // Update project with new colors
    const updateResponse = await fetch(`${API_BASE}/projects/${currentEditingProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colorScheme })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update colors');
    }

    // Regenerate the site with new colors
    const regenerateResponse = await fetch(`${API_BASE}/projects/${currentEditingProject.id}/generate`, {
      method: 'POST'
    });

    if (!regenerateResponse.ok) {
      throw new Error('Failed to regenerate site');
    }

    closeColorsModal();
    alert('✅ Colors updated! The site is being regenerated with your new colors. Refresh in a few seconds to see the changes.');

    // Reload projects
    await loadProjects();
  } catch (error) {
    console.error('Error updating colors:', error);
    showError('Failed to update colors and regenerate site');
  }
}

function formatStatus(status) {
  const statusMap = {
    draft: 'Draft',
    queued: 'Queued',
    generating: 'Generating',
    ready: 'Ready',
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

async function editContent(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project || !project.generatedSite) return;

  currentEditingProject = project;

  // Get components from generated site
  const components = project.generatedSite.components;

  // Generate editable fields for key text fields
  const fieldsHtml = components.map(comp => {
    const componentTypeLabels = {
      hero: '🦸 Hero Section',
      features: '⭐ Features',
      about: 'ℹ️ About',
      services: '🛠️ Services',
      pricing: '💰 Pricing',
      testimonials: '💬 Testimonials',
      cta: '🎯 Call to Action',
      contact: '📧 Contact',
      footer: '📄 Footer'
    };

    const label = componentTypeLabels[comp.type] || comp.type;

    return `
      <div style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 6px;">
        <h3 style="font-size: 16px; margin-bottom: 10px; color: #374151;">${label}</h3>
        ${comp.content.heading ? `
          <div class="form-group">
            <label>Heading</label>
            <input type="text" id="content_${comp.id}_heading" value="${escapeHtml(comp.content.heading)}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
        ` : ''}
        ${comp.content.subheading ? `
          <div class="form-group">
            <label>Subheading</label>
            <input type="text" id="content_${comp.id}_subheading" value="${escapeHtml(comp.content.subheading)}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
        ` : ''}
        ${comp.content.body ? `
          <div class="form-group">
            <label>Body Text</label>
            <textarea id="content_${comp.id}_body" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;">${escapeHtml(comp.content.body)}</textarea>
          </div>
        ` : ''}
        ${comp.content.buttonText ? `
          <div class="form-group">
            <label>Button Text</label>
            <input type="text" id="content_${comp.id}_buttonText" value="${escapeHtml(comp.content.buttonText)}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  document.getElementById('contentFields').innerHTML = fieldsHtml;
  document.getElementById('contentModal').classList.add('active');
}

function closeContentModal() {
  document.getElementById('contentModal').classList.remove('active');
  currentEditingProject = null;
}

async function saveContent() {
  if (!currentEditingProject || !currentEditingProject.generatedSite) return;

  const components = currentEditingProject.generatedSite.components;
  const contentOverrides = {};

  // Collect edited values
  components.forEach(comp => {
    const overrides = {};
    let hasChanges = false;

    if (comp.content.heading) {
      const input = document.getElementById(`content_${comp.id}_heading`);
      if (input && input.value !== comp.content.heading) {
        overrides.heading = input.value;
        hasChanges = true;
      }
    }

    if (comp.content.subheading) {
      const input = document.getElementById(`content_${comp.id}_subheading`);
      if (input && input.value !== comp.content.subheading) {
        overrides.subheading = input.value;
        hasChanges = true;
      }
    }

    if (comp.content.body) {
      const input = document.getElementById(`content_${comp.id}_body`);
      if (input && input.value !== comp.content.body) {
        overrides.body = input.value;
        hasChanges = true;
      }
    }

    if (comp.content.buttonText) {
      const input = document.getElementById(`content_${comp.id}_buttonText`);
      if (input && input.value !== comp.content.buttonText) {
        overrides.buttonText = input.value;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      contentOverrides[comp.id] = overrides;
    }
  });

  try {
    // Update project with content overrides
    const updateResponse = await fetch(`${API_BASE}/projects/${currentEditingProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentOverrides })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update content');
    }

    // Regenerate the site with new content
    const regenerateResponse = await fetch(`${API_BASE}/projects/${currentEditingProject.id}/generate`, {
      method: 'POST'
    });

    if (!regenerateResponse.ok) {
      throw new Error('Failed to regenerate site');
    }

    closeContentModal();
    alert('✅ Content updated! The site is being regenerated with your changes. Refresh in a few seconds to see them.');

    // Reload projects
    await loadProjects();
  } catch (error) {
    console.error('Error updating content:', error);
    showError('Failed to update content and regenerate site');
  }
}
