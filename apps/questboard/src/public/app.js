// Simple client-side router and UI
const API_BASE = '/api';

let currentView = 'goals';
let currentGoalId = null;
let currentDeckFilter = 'my-deck';
let currentUserId = 'user1'; // TODO: Get from auth

// Router
function navigate(view, goalId = null, entityId = null) {
  currentView = view;
  if (view === 'history') {
    currentGoalId = goalId; // entityType
    currentDeckFilter = entityId; // entityId
  } else {
    currentGoalId = goalId;
    if (view === 'deck') {
      currentDeckFilter = goalId || 'my-deck';
    }
  }
  render();
  if (view === 'deck') {
    window.location.hash = `deck/${goalId || 'my-deck'}`;
  } else if (view === 'history') {
    window.location.hash = `history/${goalId}/${entityId}`;
  } else {
    window.location.hash = view + (goalId ? `/${goalId}` : '');
  }
}

// Hash change handler
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  const parts = hash.split('/');
  if (parts[0] === 'goals' && parts[1] && parts[2] === 'questlines') {
    navigate('questlines', parts[1]);
  } else if (parts[0] === 'goals' && parts[1]) {
    navigate('goal-detail', parts[1]);
  } else if (parts[0] === 'deck') {
    const filter = parts[1] || 'my-deck';
    navigate('deck', filter);
  } else if (parts[0] === 'new-goal') {
    navigate('new-goal');
  } else if (parts[0] === 'org-settings') {
    navigate('org-settings');
  } else if (parts[0] === 'history' && parts[1] && parts[2]) {
    navigate('history', parts[1], parts[2]);
  } else if (parts[0] === 'sprint') {
    navigate('sprint', parts[1] || null);
  } else if (parts[0] === 'templates') {
    navigate('templates');
  } else if (parts[0] === 'new-goal-from-template') {
    const templateId = parts[1] || null;
    navigate('new-goal-from-template', templateId);
  } else if (parts[0] === 'today') {
    navigate('today');
  } else if (parts.length === 0 || parts[0] === '' || parts[0] === 'goals') {
    navigate('goals');
  } else {
    navigate('goals');
  }
});

// Initialize - default to /today if no hash
if (window.location.hash) {
  window.dispatchEvent(new Event('hashchange'));
} else {
  // Default to today screen
  navigate('today');
}

async function fetchGoals() {
  const res = await fetch(`${API_BASE}/goals`);
  return res.json();
}

async function fetchGoal(id) {
  const res = await fetch(`${API_BASE}/goals/${id}`);
  return res.json();
}

async function createGoal(title) {
  const res = await fetch(`${API_BASE}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  return res.json();
}

async function clarifyGoal(id) {
  const res = await fetch(`${API_BASE}/goals/${id}/clarify`, { method: 'POST' });
  return res.json();
}

async function approveGoal(id) {
  const res = await fetch(`${API_BASE}/goals/${id}/approve`, { method: 'POST' });
  return res.json();
}

async function denyGoal(id, reason) {
  const res = await fetch(`${API_BASE}/goals/${id}/deny`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  return res.json();
}

async function decomposeGoal(id) {
  const res = await fetch(`${API_BASE}/goals/${id}/decompose`, { method: 'POST' });
  return res.json();
}

function renderGoals(goals) {
  if (goals.length === 0) {
    return '<div class="card"><p>No goals yet. <a href="#new-goal">Create one</a></p></div>';
  }
  return goals.map(goal => `
    <div class="card">
      <h2><a href="#goals/${goal.id}" style="text-decoration: none; color: #333;">${goal.title}</a></h2>
      <span class="status ${goal.status}">${goal.status}</span>
      <p style="margin-top: 10px; color: #666;">Created: ${new Date(goal.createdAt).toLocaleDateString()}</p>
    </div>
  `).join('');
}

function renderGoalDetail(goal) {
  // "Run Clarify" button - available in draft or denied states
  const clarifyBtn = (goal.status === 'draft' || goal.status === 'denied')
    ? `<button onclick="clarify('${goal.id}')">Run Clarify</button>`
    : '';
  
  // Re-clarify button - available if already clarified but can be improved
  const reClarifyBtn = (goal.status === 'clarified_pending_approval' || goal.status === 'approved')
    ? `<button onclick="clarify('${goal.id}')" style="margin-left: 8px;">Re-clarify</button>`
    : '';
  
  // Approve/Deny buttons - only in clarified_pending_approval state
  const approveBtn = goal.status === 'clarified_pending_approval'
    ? `<button onclick="approve('${goal.id}')" style="background: #4CAF50; color: white;">Approve</button>`
    : '';
  
  const denyBtn = goal.status === 'clarified_pending_approval'
    ? `<button onclick="handleDeny('${goal.id}')" style="background: #f44336; color: white; margin-left: 8px;">Deny</button>`
    : '';
  
  // Decompose button - only when approved
  const decomposeBtn = goal.status === 'approved'
    ? `<button onclick="decompose('${goal.id}')">Decompose into Questlines</button>`
    : '';
  
  // View questlines button - after decomposition
  const questlinesBtn = goal.status === 'decomposed'
    ? `<button onclick="navigate('questlines', '${goal.id}')">View Questlines</button>`
    : '';

  let clarifySection = '';
  if (goal.clarifyOutput) {
    clarifySection = `
      <div class="card">
        <h3>Clarification</h3>
        <p><strong>What:</strong> ${goal.clarifyOutput.clarified.what}</p>
        <p><strong>Why:</strong> ${goal.clarifyOutput.clarified.why}</p>
        <p><strong>Success:</strong> ${goal.clarifyOutput.clarified.success}</p>
        <p><strong>Constraints:</strong> ${goal.clarifyOutput.clarified.constraints.join(', ')}</p>
      </div>
    `;
  }

  let denialSection = '';
  if (goal.status === 'denied' && goal.denialReason) {
    denialSection = `
      <div class="card" style="border-left: 4px solid #f44336;">
        <h3>Denial Reason</h3>
        <p>${goal.denialReason}</p>
        <small>Denied at: ${goal.deniedAt ? new Date(goal.deniedAt).toLocaleString() : 'N/A'}</small>
      </div>
    `;
  }

  return `
    <div class="card">
      <h2>${goal.title}</h2>
      <span class="status ${goal.status}">${goal.status}</span>
      <div style="margin-top: 12px;">
        ${clarifyBtn}
        ${reClarifyBtn}
        ${approveBtn}
        ${denyBtn}
        ${decomposeBtn}
        ${questlinesBtn}
      </div>
    </div>
    ${clarifySection}
    ${denialSection}
    <div><a href="#goals">← Back to Goals</a></div>
  `;
}

async function fetchQuestlines(goalId) {
  const res = await fetch(`${API_BASE}/goals/${goalId}/questlines`);
  return res.json();
}

async function fetchQuests(questlineId) {
  const res = await fetch(`${API_BASE}/questlines/${questlineId}/quests`);
  return res.json();
}

async function fetchTasks(questId) {
  const res = await fetch(`${API_BASE}/quests/${questId}/tasks`);
  return res.json();
}

async function fetchTask(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`);
  return res.json();
}

async function completeTask(taskId, expectedUpdatedAt) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedUpdatedAt })
  });
  
  if (res.status === 409) {
    const conflict = await res.json();
    throw new ConflictError(conflict);
  }
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to complete task');
  }
  
  return res.json();
}

class ConflictError extends Error {
  constructor(conflict) {
    super(conflict.message || 'Conflict detected');
    this.name = 'ConflictError';
    this.conflict = conflict;
  }
}

async function approveTask(taskId, approvedBy = 'admin') {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy })
  });
  return res.json();
}

async function fetchQuestDeck(userId) {
  const res = await fetch(`${API_BASE}/deck/${userId}`);
  return res.json();
}

async function fetchBlockedQuests() {
  const res = await fetch(`${API_BASE}/quests/blocked`);
  return res.json();
}

async function fetchReadyToUnlockQuests() {
  const res = await fetch(`${API_BASE}/quests/ready-to-unlock`);
  return res.json();
}

async function generateSprintPlan(orgId = 'default-org', weekStart = null) {
  const res = await fetch(`${API_BASE}/sprint/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId, weekStart })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to generate sprint plan');
  }
  return res.json();
}

async function fetchSprintPlans(orgId = 'default-org') {
  const res = await fetch(`${API_BASE}/sprint/plans?orgId=${orgId}`);
  return res.json();
}

async function fetchSprintPlan(weekStart, orgId = 'default-org') {
  const res = await fetch(`${API_BASE}/sprint/plan/${weekStart}?orgId=${orgId}`);
  return res.json();
}

async function approveSprintPlan(planId, approvedBy = 'admin') {
  const res = await fetch(`${API_BASE}/sprint/plan/${planId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to approve sprint plan');
  }
  return res.json();
}

async function toggleGithubSync(taskId, syncToGithub, repo = null) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/github-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ syncToGithub, repo })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to toggle GitHub sync');
  }
  return res.json();
}

async function fetchMembers(orgId = 'default-org') {
  const res = await fetch(`${API_BASE}/members?orgId=${orgId}`);
  return res.json();
}

async function updateMemberProfile(memberId, updates) {
  const res = await fetch(`${API_BASE}/members/${memberId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

async function fetchTaskAssignment(taskId, orgId = 'default-org') {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/assignment?orgId=${orgId}`);
  return res.json();
}

async function reassignAllTasks(orgId = 'default-org') {
  const res = await fetch(`${API_BASE}/assignments/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId })
  });
  return res.json();
}

async function runQuestmaster(orgId = 'default-org') {
  const res = await fetch(`${API_BASE}/questmaster/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId })
  });
  return res.json();
}

async function fetchOrg(orgId) {
  const res = await fetch(`${API_BASE}/orgs/${orgId}`);
  return res.json();
}

async function fetchTemplates(orgId = 'default-org', search = '', tags = []) {
  const params = new URLSearchParams({ orgId });
  if (search) params.append('search', search);
  if (tags.length > 0) params.append('tags', tags.join(','));
  const res = await fetch(`${API_BASE}/templates?${params}`);
  return res.json();
}

async function fetchTemplate(templateId) {
  const res = await fetch(`${API_BASE}/templates/${templateId}`);
  return res.json();
}

async function saveQuestlineAsTemplate(questlineId, title, description, tags, createdBy = 'system') {
  const res = await fetch(`${API_BASE}/questlines/${questlineId}/save-as-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, tags, createdBy, orgId: 'default-org' })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to save template');
  }
  return res.json();
}

async function spawnGoalFromTemplate(templateId, goalTitle, goalContext = '', adaptWithAI = false) {
  const res = await fetch(`${API_BASE}/templates/${templateId}/spawn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goalTitle, orgId: 'default-org', goalContext, adaptWithAI })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to spawn goal from template');
  }
  return res.json();
}

async function fetchTodayData() {
  const res = await fetch(`${API_BASE}/today?userId=${currentUserId}&orgId=default-org`);
  if (!res.ok) {
    throw new Error('Failed to fetch today data');
  }
  return res.json();
}

async function updateOrgSettings(orgId, updates) {
  const res = await fetch(`${API_BASE}/orgs/${orgId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

function getStateIcon(state) {
  switch (state) {
    case 'locked': return '🔒';
    case 'unlocked': return '🔓';
    case 'in-progress': return '⚙️';
    case 'completed': return '✅';
    default: return '';
  }
}

function getUnlockReason(quest) {
  if (quest.state !== 'locked') return '';
  if (quest.unlockConditions.length === 0) return 'No unlock conditions';
  
  const reasons = quest.unlockConditions.map(cond => {
    switch (cond.type) {
      case 'taskCompleted': return `Complete task: ${cond.taskId}`;
      case 'questCompleted': return `Complete quest: ${cond.questId}`;
      case 'allTasksCompleted': return `Complete all tasks: ${cond.taskIds.join(', ')}`;
      case 'anyTaskCompleted': return `Complete any task: ${cond.taskIds.join(', ')}`;
      default: return 'Unknown condition';
    }
  });
  
  return reasons.join(' AND ');
}

function renderQuestDeck(deckEntries) {
  if (deckEntries.length === 0) {
    return '<div class="card"><p>No active quests in your deck. Complete some tasks to unlock more quests!</p></div>';
  }

  const deckHtml = deckEntries.map(entry => {
    const tasksHtml = entry.tasks.map(task => {
      const isCheckpoint = task.requiresApproval;
      const isCompleted = task.status === 'done';
      const isApproved = task.approvedAt && task.approvedBy;
      const needsApproval = isCheckpoint && isCompleted && !isApproved;
      
      let statusIcon = '⬜';
      let statusText = '';
      if (isApproved) {
        statusIcon = '✅';
        statusText = `<span style="color: #4CAF50; font-size: 11px;">✓ Approved</span>`;
      } else if (isCompleted && isCheckpoint) {
        statusIcon = '⏳';
        statusText = `<span style="color: #ff9800; font-size: 11px;">Awaiting approval</span>`;
      } else if (isCompleted) {
        statusIcon = '✅';
        statusText = '<span style="color: #4CAF50; font-size: 11px;">Completed</span>';
      } else if (task.status === 'in-progress') {
        statusIcon = '⚙️';
      }
      
      return `
        <div class="task ${isCompleted ? 'completed' : ''} ${isCheckpoint ? 'checkpoint' : ''}" style="margin: 8px 0; padding: 10px; border-left: 3px solid ${isCheckpoint ? '#ff9800' : isCompleted ? '#4CAF50' : task.status === 'in-progress' ? '#2196F3' : '#ddd'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${statusIcon} ${task.title}</strong>
              ${isCheckpoint ? `<span style="margin-left: 8px; padding: 2px 6px; background: #ff9800; color: white; border-radius: 3px; font-size: 10px;">BOSS FIGHT</span>` : ''}
              ${statusText}
              ${task.description ? `<p style="color: #666; font-size: 13px; margin: 4px 0;">${task.description}</p>` : ''}
            </div>
            <div>
              ${task.status !== 'done' ? `<button onclick="handleCompleteTask('${task.id}', 'deck')" style="padding: 6px 12px; font-size: 12px; margin-right: 4px;">Complete</button>` : ''}
              ${needsApproval ? `<button onclick="handleApproveTask('${task.id}', 'deck')" style="padding: 6px 12px; font-size: 12px; background: #4CAF50; color: white;">Approve</button>` : ''}
              ${task.github && task.github.url ? `<a href="${task.github.url}" target="_blank" style="padding: 6px 12px; font-size: 12px; margin-right: 4px; background: #24292e; color: white; text-decoration: none; border-radius: 4px;">🔗 GitHub</a>` : ''}
              <button onclick="handleToggleGithubSync('${task.id}', ${task.syncToGithub || false})" style="padding: 6px 12px; font-size: 12px; margin-right: 4px; background: ${task.syncToGithub ? '#4CAF50' : '#ccc'}; color: white; border: none; border-radius: 4px;">${task.syncToGithub ? '✓ Synced' : 'Sync to GitHub'}</button>
            </div>
          </div>
          ${isApproved && task.approvedAt ? `<p style="color: #999; font-size: 11px; margin: 4px 0;">Approved on ${new Date(task.approvedAt).toLocaleString()}</p>` : ''}
        </div>
      `;
    }).join('');

    const microStepsHtml = entry.microSteps.length > 0 ? `
      <div style="margin-top: 12px; padding: 10px; background: #f0f8ff; border-radius: 4px;">
        <strong style="font-size: 12px; color: #666;">First 15 Minutes:</strong>
        <ul style="margin: 8px 0; padding-left: 20px; font-size: 13px;">
          ${entry.microSteps.map(step => `<li>${step.description} (${step.estimatedMinutes} min)</li>`).join('')}
        </ul>
      </div>
    ` : '';

    return `
      <div class="quest-deck-entry" style="margin: 20px 0; padding: 16px; border: 2px solid #0066cc; border-radius: 8px; background: white;">
        <h3>${getStateIcon(entry.quest.state)} ${entry.quest.title}</h3>
        <p style="color: #666; font-size: 14px; margin: 8px 0;">${entry.quest.objective}</p>
        <div style="margin-top: 12px;">
          <strong>Tasks (${entry.tasks.length}):</strong>
          ${tasksHtml}
        </div>
        ${microStepsHtml}
        <div style="margin-top: 12px; font-size: 12px; color: #999;">
          Total estimated: ~${Math.round(entry.totalEstimatedMinutes / 60 * 10) / 10} hours
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>🎯 Your Quest Deck</h2>
      <p style="color: #666;">Your focused daily view - top active quests with tasks ready to work on</p>
    </div>
    ${deckHtml}
  `;
}

function renderBlockedQuests(quests) {
  if (quests.length === 0) {
    return '<div class="card"><p>No blocked quests.</p></div>';
  }

  const questsHtml = quests.map(quest => {
    const unlockReason = getUnlockReason(quest);
    return `
      <div class="quest-blocked" style="margin: 10px 0; padding: 12px; border: 1px solid #ff9800; border-radius: 4px; background: #fff3e0;">
        <h4>🔒 ${quest.title}</h4>
        <p style="color: #666; font-size: 14px;">${quest.objective}</p>
        <p style="color: #e65100; font-size: 12px; margin-top: 8px;"><strong>Blocked:</strong> ${unlockReason}</p>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>🚫 Blocked Quests</h2>
      <p style="color: #666;">Quests waiting for prerequisites to be completed</p>
    </div>
    ${questsHtml}
  `;
}

function renderReadyToUnlockQuests(quests) {
  if (quests.length === 0) {
    return '<div class="card"><p>No quests ready to unlock.</p></div>';
  }

  const questsHtml = quests.map(quest => {
    const unlockReason = getUnlockReason(quest);
    return `
      <div class="quest-ready" style="margin: 10px 0; padding: 12px; border: 1px solid #4CAF50; border-radius: 4px; background: #e8f5e9;">
        <h4>🔓 ${quest.title}</h4>
        <p style="color: #666; font-size: 14px;">${quest.objective}</p>
        <p style="color: #2e7d32; font-size: 12px; margin-top: 8px;"><strong>Almost ready:</strong> ${unlockReason}</p>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>⏳ Ready to Unlock</h2>
      <p style="color: #666;">Quests where most prerequisites are met - finish a few more tasks to unlock!</p>
    </div>
    ${questsHtml}
  `;
}

async function renderQuestlines(goal) {
  const questlines = await fetchQuestlines(goal.id);
  
  if (questlines.length === 0) {
    return '<div class="card"><p>No questlines yet. Decompose the goal first.</p></div>';
  }

  const questlinesHtml = await Promise.all(questlines.map(async (ql) => {
    const quests = await fetchQuests(ql.id);
    const questsHtml = await Promise.all(quests.map(async (quest) => {
      const tasks = await fetchTasks(quest.id);
      const tasksHtmlArray = await Promise.all(tasks.map(async (task) => {
        const assignmentExplanation = task.owner ? await fetchTaskAssignment(task.id).catch(() => null) : null;
        const explanationHtml = assignmentExplanation ? `
          <div style="margin-top: 8px; padding: 8px; background: #f0f8ff; border-radius: 4px; font-size: 11px;">
            <strong>Why assigned to ${task.owner}:</strong>
            <div style="margin-top: 4px;">
              ${assignmentExplanation.scores.find(s => s.userId === task.owner) ? `
                Score: ${assignmentExplanation.scores.find(s => s.userId === task.owner).totalScore}
                (Genius: +${assignmentExplanation.scores.find(s => s.userId === task.owner).breakdown.geniusMatch}, 
                 Competency: +${assignmentExplanation.scores.find(s => s.userId === task.owner).breakdown.competencyMatch}, 
                 Frustration: ${assignmentExplanation.scores.find(s => s.userId === task.owner).breakdown.frustrationPenalty}, 
                 Workload: ${assignmentExplanation.scores.find(s => s.userId === task.owner).breakdown.workloadPenalty})
              ` : ''}
            </div>
            ${assignmentExplanation.topAlternatives.length > 0 ? `
              <div style="margin-top: 4px; color: #666;">
                Alternatives: ${assignmentExplanation.topAlternatives.map(alt => `${alt.userId} (${alt.score})`).join(', ')}
              </div>
            ` : ''}
          </div>
        ` : '';
        
        const isCheckpoint = task.requiresApproval;
        const isCompleted = task.status === 'done';
        const isApproved = task.approvedAt && task.approvedBy;
        const needsApproval = isCheckpoint && isCompleted && !isApproved;
        const hasGithubIssue = task.github && task.github.url;
        
        let statusIcon = '⬜';
        let statusText = '';
        if (isApproved) {
          statusIcon = '✅';
          statusText = `<span style="color: #4CAF50; font-size: 11px;">✓ Approved by ${task.approvedBy}</span>`;
        } else if (isCompleted && isCheckpoint) {
          statusIcon = '⏳';
          statusText = `<span style="color: #ff9800; font-size: 11px;">Awaiting approval</span>`;
        } else if (isCompleted) {
          statusIcon = '✅';
          statusText = '<span style="color: #4CAF50; font-size: 11px;">Completed</span>';
        }
        
        return `
          <div class="task ${isCompleted ? 'completed' : ''} ${isCheckpoint ? 'checkpoint' : ''}" style="margin-left: 20px; padding: 8px; border-left: 2px solid ${isCheckpoint ? '#ff9800' : '#ddd'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span>${statusIcon} ${task.title} ${task.owner ? `<span style="color: #666; font-size: 11px;">(assigned to ${task.owner})</span>` : ''}</span>
                  ${isCheckpoint ? `<span style="padding: 2px 6px; background: #ff9800; color: white; border-radius: 3px; font-size: 10px;">BOSS FIGHT</span>` : ''}
                  <button onclick="navigate('history', 'task', '${task.id}')" style="padding: 2px 6px; font-size: 10px; background: #f0f0f0; border: none; border-radius: 3px; cursor: pointer;">📜</button>
                </div>
                ${statusText}
              </div>
              <div>
                ${task.status !== 'done' ? `<button onclick="handleCompleteTask('${task.id}', '${goal.id}')" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;">Complete</button>` : ''}
                ${needsApproval ? `<button onclick="handleApproveTask('${task.id}', '${goal.id}')" style="padding: 4px 8px; font-size: 12px; background: #4CAF50; color: white;">Approve</button>` : ''}
                ${task.github && task.github.url ? `<a href="${task.github.url}" target="_blank" style="padding: 4px 8px; font-size: 12px; margin-right: 4px; background: #24292e; color: white; text-decoration: none; border-radius: 4px;">🔗 GitHub</a>` : ''}
                <button onclick="handleToggleGithubSync('${task.id}', ${task.syncToGithub || false})" style="padding: 4px 8px; font-size: 12px; margin-right: 4px; background: ${task.syncToGithub ? '#4CAF50' : '#ccc'}; color: white; border: none; border-radius: 4px;">${task.syncToGithub ? '✓ Synced' : 'Sync'}</button>
              </div>
            </div>
            ${task.description ? `<p style="color: #666; font-size: 12px; margin: 4px 0;">${task.description}</p>` : ''}
            ${isApproved && task.approvedAt ? `<p style="color: #999; font-size: 11px; margin: 4px 0;">Approved on ${new Date(task.approvedAt).toLocaleString()}</p>` : ''}
            ${explanationHtml}
          </div>
        `;
      }));
      const tasksHtml = tasksHtmlArray.join('');
      
      const unlockReason = getUnlockReason(quest);
      
      return `
        <div class="quest ${quest.state}" style="margin: 10px 0; padding: 12px; border: 1px solid #ddd; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4>${getStateIcon(quest.state)} ${quest.title}</h4>
              <p style="color: #666; font-size: 14px;">${quest.objective}</p>
              ${unlockReason ? `<p style="color: #999; font-size: 12px; font-style: italic;">Unlock: ${unlockReason}</p>` : ''}
            </div>
            <button onclick="navigate('history', 'quest', '${quest.id}')" style="padding: 4px 8px; font-size: 11px; background: #f0f0f0;">History</button>
          </div>
          ${tasksHtml}
        </div>
      `;
    }));
    
    return `
      <div class="questline" style="margin: 20px 0; padding: 16px; border: 2px solid #ccc; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h3>${ql.title}</h3>
            ${ql.epic ? `<p style="color: #666;">${ql.epic}</p>` : ''}
          </div>
          <button onclick="handleSaveAsTemplate('${ql.id}', '${goal.id}')" style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">💾 Save as Template</button>
        </div>
        ${questsHtml.join('')}
      </div>
    `;
  }));

  return `
    <div class="card">
      <h2>Questlines for: ${goal.title}</h2>
    </div>
    ${questlinesHtml.join('')}
    <div><a href="#goals/${goal.id}">← Back to Goal</a></div>
  `;
}

async function render() {
  const app = document.getElementById('app');
  
  if (currentView === 'goals') {
    const goals = await fetchGoals();
    app.innerHTML = `
      <div class="card">
        <h2>Goals</h2>
        <button onclick="navigate('today')" style="margin-left: 8px; background: #4CAF50; color: white; font-weight: bold;">📅 Today</button>
        <button onclick="navigate('new-goal')">+ New Goal</button>
        <button onclick="navigate('deck', 'my-deck')" style="margin-left: 8px;">View My Deck</button>
        <button onclick="navigate('members')" style="margin-left: 8px;">Members & Profiles</button>
        <button onclick="navigate('org-settings')" style="margin-left: 8px;">Org Settings</button>
        <button onclick="navigate('templates')" style="margin-left: 8px; background: #9c27b0; color: white;">📋 Templates</button>
        <button onclick="handleReassignAll()" style="margin-left: 8px; background: #ff9800;">Re-run Assignments</button>
        <button onclick="handleRunQuestmaster()" style="margin-left: 8px; background: #4CAF50; color: white;">Run Questmaster Now</button>
      </div>
      ${renderGoals(goals)}
    `;
  } else if (currentView === 'new-goal') {
    app.innerHTML = `
      <div class="card">
        <h2>New Goal</h2>
        <input type="text" id="goalTitle" placeholder="Enter goal title..." />
        <button onclick="handleCreateGoal()">Create Goal</button>
        <button onclick="navigate('goals')">Cancel</button>
      </div>
    `;
  } else if (currentView === 'goal-detail') {
    const goal = await fetchGoal(currentGoalId);
    app.innerHTML = renderGoalDetail(goal);
  } else if (currentView === 'questlines') {
    const goal = await fetchGoal(currentGoalId);
    app.innerHTML = renderQuestlines(goal);
  } else if (currentView === 'members') {
    const members = await fetchMembers();
    app.innerHTML = renderMembers(members);
  } else if (currentView === 'org-settings') {
    const org = await fetchOrg('default-org');
    app.innerHTML = renderOrgSettings(org);
  } else if (currentView === 'templates') {
    const templates = await fetchTemplates();
    app.innerHTML = renderTemplates(templates);
  } else if (currentView === 'new-goal-from-template') {
    const templateId = currentGoalId; // Reusing currentGoalId for templateId
    if (templateId) {
      const templateData = await fetchTemplate(templateId);
      app.innerHTML = renderNewGoalFromTemplate(templateData);
    } else {
      const templates = await fetchTemplates();
      app.innerHTML = renderSelectTemplate(templates);
    }
  } else if (currentView === 'today') {
    const todayData = await fetchTodayData();
    app.innerHTML = renderToday(todayData);
  } else if (currentView === 'deck') {
    const filter = currentGoalId || 'my-deck';
    
    if (filter === 'my-deck') {
      const deck = await fetchQuestDeck(currentUserId);
      app.innerHTML = `
        <div style="margin-bottom: 20px;">
          <button onclick="navigate('deck', 'my-deck')" style="background: ${filter === 'my-deck' ? '#0066cc' : '#ccc'}; color: white;">My Deck</button>
          <button onclick="navigate('deck', 'blocked')" style="background: ${filter === 'blocked' ? '#ff9800' : '#ccc'}; color: white; margin-left: 8px;">Blocked</button>
          <button onclick="navigate('deck', 'ready-to-unlock')" style="background: ${filter === 'ready-to-unlock' ? '#4CAF50' : '#ccc'}; color: white; margin-left: 8px;">Ready to Unlock</button>
          <button onclick="navigate('goals')" style="margin-left: 16px;">← Back to Goals</button>
        </div>
        ${renderQuestDeck(deck)}
      `;
    } else if (filter === 'blocked') {
      const blocked = await fetchBlockedQuests();
      app.innerHTML = `
        <div style="margin-bottom: 20px;">
          <button onclick="navigate('deck', 'my-deck')" style="background: ${filter === 'my-deck' ? '#0066cc' : '#ccc'}; color: white;">My Deck</button>
          <button onclick="navigate('deck', 'blocked')" style="background: ${filter === 'blocked' ? '#ff9800' : '#ccc'}; color: white; margin-left: 8px;">Blocked</button>
          <button onclick="navigate('deck', 'ready-to-unlock')" style="background: ${filter === 'ready-to-unlock' ? '#4CAF50' : '#ccc'}; color: white; margin-left: 8px;">Ready to Unlock</button>
          <button onclick="navigate('goals')" style="margin-left: 16px;">← Back to Goals</button>
        </div>
        ${renderBlockedQuests(blocked)}
      `;
    } else if (filter === 'ready-to-unlock') {
      const ready = await fetchReadyToUnlockQuests();
      app.innerHTML = `
        <div style="margin-bottom: 20px;">
          <button onclick="navigate('deck', 'my-deck')" style="background: ${filter === 'my-deck' ? '#0066cc' : '#ccc'}; color: white;">My Deck</button>
          <button onclick="navigate('deck', 'blocked')" style="background: ${filter === 'blocked' ? '#ff9800' : '#ccc'}; color: white; margin-left: 8px;">Blocked</button>
          <button onclick="navigate('deck', 'ready-to-unlock')" style="background: ${filter === 'ready-to-unlock' ? '#4CAF50' : '#ccc'}; color: white; margin-left: 8px;">Ready to Unlock</button>
          <button onclick="navigate('goals')" style="margin-left: 16px;">← Back to Goals</button>
        </div>
        ${renderReadyToUnlockQuests(ready)}
      `;
    }
  }
}

async function handleCreateGoal() {
  const title = document.getElementById('goalTitle').value;
  if (!title) return;
  await createGoal(title);
  navigate('goals');
}

window.clarify = async function(id) {
  await clarifyGoal(id);
  navigate('goal-detail', id);
};

window.approve = async function(id) {
  await approveGoal(id);
  navigate('goal-detail', id);
};

window.handleDeny = async function(id) {
  const reason = prompt('Please provide a reason for denying this goal clarification:');
  if (reason && reason.trim().length > 0) {
    try {
      await denyGoal(id, reason.trim());
      navigate('goal-detail', id);
    } catch (error) {
      alert('Failed to deny goal: ' + error.message);
    }
  } else if (reason !== null) {
    alert('Denial reason cannot be empty');
  }
};

window.decompose = async function(id) {
  try {
    await decomposeGoal(id);
    navigate('goal-detail', id);
  } catch (error) {
    alert('Failed to decompose goal. Make sure it is approved first.');
  }
};

window.handleCompleteTask = async function(taskId, goalId) {
  try {
    // Get current task to get updatedAt
    const task = await fetchTask(taskId);
    await completeTask(taskId, task.updatedAt);
    if (goalId === 'deck') {
      navigate('deck', 'my-deck');
    } else if (goalId === 'today') {
      navigate('today');
    } else {
      navigate('questlines', goalId);
    }
  } catch (error) {
    if (error instanceof ConflictError) {
      showConflictModal(error.conflict, async () => {
        // Retry after user reviews
        try {
          const latestTask = error.conflict.latestEntity;
          await completeTask(taskId, latestTask.updatedAt);
          if (goalId === 'deck') {
            navigate('deck', 'my-deck');
          } else {
            navigate('questlines', goalId);
          }
        } catch (retryError) {
          alert('Failed to complete task: ' + retryError.message);
        }
      });
    } else {
      alert('Failed to complete task: ' + error.message);
    }
  }
};

window.handleApproveTask = async function(taskId, goalId) {
  try {
    await approveTask(taskId, currentUserId);
    if (goalId === 'deck') {
      navigate('deck', 'my-deck');
    } else if (goalId === 'today') {
      navigate('today');
    } else {
      navigate('questlines', goalId);
    }
  } catch (error) {
    alert('Failed to approve task: ' + (error.message || 'Unknown error'));
  }
};

window.navigate = navigate;

window.handleReassignAll = async function() {
  if (confirm('Re-assign all unassigned tasks? This will use Working Genius profiles to assign tasks.')) {
    try {
      await reassignAllTasks();
      alert('Tasks reassigned successfully!');
      navigate('goals');
    } catch (error) {
      alert('Failed to reassign tasks: ' + error.message);
    }
  }
};

window.handleRunQuestmaster = async function() {
  if (confirm('Run Questmaster now? This will:\n- Recompute unlocks\n- Update Quest Decks\n- Flag stale/blocked tasks\n- Emit digest events')) {
    try {
      await runQuestmaster();
      alert('Questmaster completed successfully! Decks updated and events emitted.');
      // Refresh current view if on today screen
      if (currentView === 'today') {
        navigate('today');
      } else {
        navigate('goals');
      }
    } catch (error) {
      alert('Failed to run Questmaster: ' + error.message);
    }
  }
};

function renderMembers(members) {
  if (members.length === 0) {
    return '<div class="card"><p>No members found. Add members to enable task assignment.</p></div>';
  }

  const membersHtml = members.map(member => {
    const profile = member.workingGeniusProfile || { top2: ['Enablement', 'Tenacity'], competency2: ['Enablement', 'Tenacity'], frustration2: ['Wonder', 'Invention'] };
    const capacity = member.dailyCapacityMinutes || 480;
    
    return `
      <div class="card" style="margin-bottom: 20px;">
        <h3>${member.email}</h3>
        <div style="margin-top: 12px;">
          <label><strong>Top 2 Genius:</strong></label>
          <select id="top2-0-${member.id}" style="margin-left: 8px;">
            ${['Wonder', 'Invention', 'Discernment', 'Galvanizing', 'Enablement', 'Tenacity'].map(g => 
              `<option value="${g}" ${profile.top2[0] === g ? 'selected' : ''}>${g}</option>`
            ).join('')}
          </select>
          <select id="top2-1-${member.id}" style="margin-left: 8px;">
            ${['Wonder', 'Invention', 'Discernment', 'Galvanizing', 'Enablement', 'Tenacity'].map(g => 
              `<option value="${g}" ${profile.top2[1] === g ? 'selected' : ''}>${g}</option>`
            ).join('')}
          </select>
        </div>
        <div style="margin-top: 8px;">
          <label><strong>Competency 2:</strong></label>
          <select id="comp2-0-${member.id}" style="margin-left: 8px;">
            ${['Wonder', 'Invention', 'Discernment', 'Galvanizing', 'Enablement', 'Tenacity'].map(g => 
              `<option value="${g}" ${profile.competency2[0] === g ? 'selected' : ''}>${g}</option>`
            ).join('')}
          </select>
          <select id="comp2-1-${member.id}" style="margin-left: 8px;">
            ${['Wonder', 'Invention', 'Discernment', 'Galvanizing', 'Enablement', 'Tenacity'].map(g => 
              `<option value="${g}" ${profile.competency2[1] === g ? 'selected' : ''}>${g}</option>`
            ).join('')}
          </select>
        </div>
        <div style="margin-top: 8px;">
          <label><strong>Frustration 2:</strong></label>
          <select id="frust2-0-${member.id}" style="margin-left: 8px;">
            ${['Wonder', 'Invention', 'Discernment', 'Galvanizing', 'Enablement', 'Tenacity'].map(g => 
              `<option value="${g}" ${profile.frustration2[0] === g ? 'selected' : ''}>${g}</option>`
            ).join('')}
          </select>
          <select id="frust2-1-${member.id}" style="margin-left: 8px;">
            ${['Wonder', 'Invention', 'Discernment', 'Galvanizing', 'Enablement', 'Tenacity'].map(g => 
              `<option value="${g}" ${profile.frustration2[1] === g ? 'selected' : ''}>${g}</option>`
            ).join('')}
          </select>
        </div>
        <div style="margin-top: 8px;">
          <label><strong>Daily Capacity (minutes):</strong></label>
          <input type="number" id="capacity-${member.id}" value="${capacity}" style="margin-left: 8px; width: 100px;" />
        </div>
        <button onclick="handleSaveProfile('${member.id}')" style="margin-top: 12px;">Save Profile</button>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2>Members & Working Genius Profiles</h2>
      <p style="color: #666;">Configure Working Genius profiles to enable intelligent task assignment.</p>
      <button onclick="navigate('goals')" style="margin-bottom: 20px;">← Back to Goals</button>
    </div>
    ${membersHtml}
  `;
}

window.handleSaveProfile = async function(memberId) {
  const top2_0 = document.getElementById(`top2-0-${memberId}`).value;
  const top2_1 = document.getElementById(`top2-1-${memberId}`).value;
  const comp2_0 = document.getElementById(`comp2-0-${memberId}`).value;
  const comp2_1 = document.getElementById(`comp2-1-${memberId}`).value;
  const frust2_0 = document.getElementById(`frust2-0-${memberId}`).value;
  const frust2_1 = document.getElementById(`frust2-1-${memberId}`).value;
  const capacity = parseInt(document.getElementById(`capacity-${memberId}`).value);

  try {
    await updateMemberProfile(memberId, {
      workingGeniusProfile: {
        top2: [top2_0, top2_1],
        competency2: [comp2_0, comp2_1],
        frustration2: [frust2_0, frust2_1],
      },
      dailyCapacityMinutes: capacity,
    });
    alert('Profile updated! Tasks will be reassigned based on new profile.');
    navigate('members');
  } catch (error) {
    alert('Failed to update profile: ' + error.message);
  }
};

function renderOrgSettings(org) {
  if (!org) {
    return '<div class="card"><p>Organization not found.</p></div>';
  }

  const settings = org.notificationSettings || {};
  const slackChannel = settings.slackChannelId || '';
  const slackEnabled = settings.slackEnabled || false;
  const emailEnabled = settings.emailEnabled || false;

  return `
    <div class="card">
      <h2>Organization Settings</h2>
      <p style="color: #666;">Configure notification settings for your organization.</p>
      <button onclick="navigate('goals')" style="margin-bottom: 20px;">← Back to Goals</button>
    </div>
    <div class="card" style="margin-bottom: 20px;">
      <h3>Slack Notifications</h3>
      <div style="margin-top: 12px;">
        <label>
          <input type="checkbox" id="slack-enabled" ${slackEnabled ? 'checked' : ''} />
          <strong>Enable Slack notifications</strong>
        </label>
      </div>
      <div style="margin-top: 12px;">
        <label><strong>Slack Channel ID:</strong></label>
        <input type="text" id="slack-channel" value="${slackChannel}" placeholder="C1234567890" style="margin-left: 8px; width: 300px;" />
        <p style="color: #666; font-size: 12px; margin-top: 4px;">Channel ID (e.g., C1234567890) or channel name (e.g., #questboard)</p>
      </div>
    </div>
    <div class="card" style="margin-bottom: 20px;">
      <h3>Email Notifications</h3>
      <div style="margin-top: 12px;">
        <label>
          <input type="checkbox" id="email-enabled" ${emailEnabled ? 'checked' : ''} />
          <strong>Enable email notifications</strong>
        </label>
        <p style="color: #666; font-size: 12px; margin-top: 4px;">Email notifications are sent to each member's email address.</p>
      </div>
    </div>
    <div class="card">
      <button onclick="handleSaveOrgSettings('${org.id}')" style="background: #4CAF50; color: white;">Save Settings</button>
    </div>
  `;
}

window.handleSaveOrgSettings = async function(orgId) {
  const slackEnabled = document.getElementById('slack-enabled').checked;
  const slackChannel = document.getElementById('slack-channel').value.trim();
  const emailEnabled = document.getElementById('email-enabled').checked;

  try {
    await updateOrgSettings(orgId, {
      notificationSettings: {
        slackChannelId: slackChannel || undefined,
        slackEnabled: slackEnabled,
        emailEnabled: emailEnabled,
      },
    });
    alert('Organization settings updated!');
    navigate('org-settings');
  } catch (error) {
    alert('Failed to update settings: ' + error.message);
  }
};

function renderHistory(entityType, entityId, events) {
  if (events.length === 0) {
    return `
      <div class="card">
        <h2>History</h2>
        <p>No history found for this ${entityType}.</p>
        <button onclick="navigate('goals')">← Back</button>
      </div>
    `;
  }

  const eventsHtml = events.map(event => {
    const payload = event.payload || {};
    const actor = payload.actor || payload.actorEmail || 'system';
    const timestamp = new Date(event.createdAt).toLocaleString();
    
    let description = '';
    let details = '';
    
    if (event.type === 'audit.task.changed') {
      const before = payload.before || {};
      const after = payload.after || {};
      const changes = payload.changes || [];
      
      if (payload.action === 'created') {
        description = `Task created`;
        details = `Title: ${after.title || 'N/A'}, Status: ${after.status || 'N/A'}, Owner: ${after.owner || 'Unassigned'}`;
      } else {
        description = `Task updated`;
        const changeDescriptions = changes.map(change => {
          if (change === 'status') {
            return `Status: ${before.status} → ${after.status}`;
          } else if (change === 'owner') {
            return `Owner: ${before.owner || 'Unassigned'} → ${after.owner || 'Unassigned'}`;
          } else if (change === 'title') {
            return `Title: ${before.title} → ${after.title}`;
          } else if (change === 'priority') {
            return `Priority: ${before.priority} → ${after.priority}`;
          }
          return `${change}: changed`;
        });
        details = changeDescriptions.join(', ');
      }
    } else if (event.type === 'audit.assignment.changed') {
      description = `Assignment changed`;
      const reason = payload.reason || 'Auto-assigned';
      const explanation = payload.explanation;
      details = `${reason}`;
      if (explanation) {
        details += ` (Genius: +${explanation.details?.geniusMatch || 0}, Competency: +${explanation.details?.competencyMatch || 0}, Frustration: ${explanation.details?.frustrationMatch || 0}, Workload: ${explanation.details?.workloadPenalty || 0})`;
      }
      if (payload.alternatives && payload.alternatives.length > 0) {
        details += ` | Alternatives: ${payload.alternatives.map(a => `${a.userId} (${a.score})`).join(', ')}`;
      }
    } else if (event.type === 'audit.quest.changed') {
      description = `Quest updated`;
      const before = payload.before || {};
      const after = payload.after || {};
      const changes = payload.changes || [];
      const changeDescriptions = changes.map(change => {
        if (change === 'state') {
          return `State: ${before.state} → ${after.state}`;
        } else if (change === 'title') {
          return `Title: ${before.title} → ${after.title}`;
        }
        return `${change}: changed`;
      });
      details = changeDescriptions.join(', ');
    } else if (event.type === 'task.created') {
      description = `Task created`;
      details = `Title: ${payload.title || 'N/A'}`;
    } else if (event.type === 'task.completed') {
      description = `Task completed`;
      details = payload.requiresApproval ? 'Awaiting approval' : 'Completed';
    } else if (event.type === 'task.approved') {
      description = `Task approved`;
      details = `Approved by ${payload.approvedBy || 'N/A'}`;
    } else if (event.type === 'quest.unlocked') {
      description = `Quest unlocked`;
      details = `Quest "${payload.title || 'N/A'}" is now available`;
    } else {
      description = event.type;
      details = JSON.stringify(payload).substring(0, 100);
    }
    
    return `
      <div style="padding: 12px; border-bottom: 1px solid #eee;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <strong>${description}</strong>
            <p style="color: #666; font-size: 13px; margin: 4px 0;">${details}</p>
            <p style="color: #999; font-size: 11px; margin: 4px 0;">by ${actor} at ${timestamp}</p>
          </div>
          ${event.correlationId ? `<span style="color: #999; font-size: 10px;">${event.correlationId.substring(0, 20)}...</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="card">
      <h2>History: ${entityType} ${entityId}</h2>
      <button onclick="navigate('goals')" style="margin-bottom: 20px;">← Back</button>
    </div>
    <div class="card">
      <h3>Change Log</h3>
      <div style="max-height: 600px; overflow-y: auto;">
        ${eventsHtml}
      </div>
    </div>
  `;
}

function showConflictModal(conflict, onRetry) {
  const latest = conflict.latestEntity;
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 24px; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <h2 style="margin-top: 0; color: #d32f2f;">⚠️ Conflict Detected</h2>
      <p style="color: #666; margin-bottom: 20px;">
        Your copy is stale. The task was modified by another user. Review the latest version and reapply your changes.
      </p>
      
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; color: #666;">Latest Version:</h3>
        <div style="padding: 12px; background: #f5f5f5; border-radius: 4px; margin-top: 8px;">
          <p><strong>Title:</strong> ${latest.title || 'N/A'}</p>
          <p><strong>Status:</strong> ${latest.status || 'N/A'}</p>
          <p><strong>Owner:</strong> ${latest.owner || 'Unassigned'}</p>
          <p><strong>Priority:</strong> ${latest.priority || 'N/A'}</p>
          <p><strong>Last Updated:</strong> ${latest.updatedAt ? new Date(latest.updatedAt).toLocaleString() : 'N/A'}</p>
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button onclick="this.closest('div[style*=\"position: fixed\"]').remove(); location.reload();" 
                style="padding: 8px 16px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
          Refresh Page
        </button>
        <button onclick="
          const modal = this.closest('div[style*=\"position: fixed\"]');
          modal.remove();
          (${onRetry.toString()})();
        " 
                style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Retry with Latest
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function renderSprint() {
  return `
    <div class="card">
      <h2>Sprint Planning</h2>
      <button onclick="navigate('goals')" style="margin-bottom: 20px;">← Back to Goals</button>
      <button onclick="handleGenerateSprintPlan()" style="background: #4CAF50; color: white; margin-bottom: 20px;">Generate Sprint Plan</button>
      <div id="sprint-content">
        <p>Click "Generate Sprint Plan" to create a weekly plan for the current week.</p>
      </div>
    </div>
  `;
}

async function renderSprintPlan(plan, diff = null, existingPlan = null) {
  let diffHtml = '';
  if (diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0)) {
    diffHtml = `
      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
        <h3>⚠️ Plan Already Exists - Changes Detected</h3>
        ${diff.added.length > 0 ? `<p><strong>Added members:</strong> ${diff.added.map(m => m.memberEmail).join(', ')}</p>` : ''}
        ${diff.removed.length > 0 ? `<p><strong>Removed members:</strong> ${diff.removed.map(m => m.memberEmail).join(', ')}</p>` : ''}
        ${diff.changed.length > 0 ? `
          <p><strong>Changed allocations:</strong></p>
          <ul>
            ${diff.changed.map(c => `
              <li>${c.memberId}: ${c.oldTasks} tasks (${c.oldAllocated} min) → ${c.newTasks} tasks (${c.newAllocated} min)</li>
            `).join('')}
          </ul>
        ` : ''}
        <button onclick="handleApproveSprintPlan('${plan.id}')" style="background: #4CAF50; color: white; margin-top: 8px;">Approve & Overwrite</button>
        <button onclick="navigate('sprint')" style="margin-left: 8px;">Cancel</button>
      </div>
    `;
  }
  
  const memberPlansHtml = plan.memberPlans.map(mp => {
    const utilizationPercent = (mp.capacityUtilization * 100).toFixed(1);
    const utilizationColor = mp.capacityUtilization > 1.0 ? '#d32f2f' : mp.capacityUtilization > 0.9 ? '#ff9800' : '#4CAF50';
    
    return `
      <div style="border: 1px solid #ddd; border-radius: 4px; padding: 16px; margin-bottom: 16px;">
        <h3>${mp.memberEmail}</h3>
        <p><strong>Capacity:</strong> ${mp.allocatedMinutes} / ${mp.totalCapacityMinutes} minutes (${utilizationPercent}%)</p>
        <div style="background: #f5f5f5; height: 20px; border-radius: 4px; margin: 8px 0;">
          <div style="background: ${utilizationColor}; height: 100%; width: ${Math.min(utilizationPercent, 100)}%; border-radius: 4px;"></div>
        </div>
        <div style="margin-top: 12px;">
          <h4>Quests (${mp.quests.length}):</h4>
          <ul>
            ${mp.quests.map(q => `<li>${q.questTitle}</li>`).join('')}
          </ul>
        </div>
        <div style="margin-top: 12px;">
          <h4>Tasks (${mp.tasks.length}):</h4>
          <ul>
            ${mp.tasks.map(t => `<li>${t.taskTitle} (${t.priority})</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="card">
      <h2>Sprint Plan: ${plan.weekStart} to ${plan.weekEnd}</h2>
      <p><strong>Status:</strong> ${plan.status}</p>
      ${plan.status === 'draft' && !diff ? `
        <button onclick="handleApproveSprintPlan('${plan.id}')" style="background: #4CAF50; color: white; margin-bottom: 20px;">Approve Sprint Plan</button>
      ` : ''}
      ${diffHtml}
      <div style="margin-top: 20px;">
        ${memberPlansHtml}
      </div>
    </div>
  `;
}

window.handleGenerateSprintPlan = async function() {
  try {
    const result = await generateSprintPlan();
    const content = document.getElementById('sprint-content');
    if (result.diff) {
      content.innerHTML = await renderSprintPlan(result.plan, result.diff, result.existingPlan);
    } else {
      content.innerHTML = await renderSprintPlan(result.plan);
    }
  } catch (error) {
    alert('Failed to generate sprint plan: ' + error.message);
  }
};

window.handleApproveSprintPlan = async function(planId) {
  try {
    await approveSprintPlan(planId, currentUserId);
    alert('Sprint plan approved!');
    navigate('sprint');
  } catch (error) {
    alert('Failed to approve sprint plan: ' + error.message);
  }
};

window.handleToggleGithubSync = async function(taskId, currentSyncState) {
  try {
    if (!currentSyncState) {
      // Prompt for repo when enabling
      const repo = prompt('Enter GitHub repository (format: owner/repo):');
      if (!repo || !repo.includes('/')) {
        alert('Invalid repository format. Use format: owner/repo');
        return;
      }
      await toggleGithubSync(taskId, true, repo);
      alert('GitHub sync enabled! The issue will be created by the sync job.');
    } else {
      await toggleGithubSync(taskId, false);
      alert('GitHub sync disabled.');
    }
    // Refresh the current view
    render();
  } catch (error) {
    alert('Failed to toggle GitHub sync: ' + error.message);
  }
};

function renderTemplates(templates) {
  if (templates.length === 0) {
    return `
      <div class="card">
        <h2>📋 Templates</h2>
        <p>No templates yet. Save a questline as a template to get started.</p>
        <button onclick="navigate('goals')">← Back to Goals</button>
      </div>
    `;
  }
  
  const templatesHtml = templates.map(template => `
    <div class="card" style="margin-bottom: 16px;">
      <h3>${template.title}</h3>
      ${template.description ? `<p style="color: #666; margin: 8px 0;">${template.description}</p>` : ''}
      ${template.tags && template.tags.length > 0 ? `
        <div style="margin: 8px 0;">
          ${template.tags.map(tag => `<span style="display: inline-block; padding: 2px 8px; background: #e3f2fd; color: #1976d2; border-radius: 12px; font-size: 11px; margin-right: 4px;">${tag}</span>`).join('')}
        </div>
      ` : ''}
      <div style="margin-top: 12px; font-size: 12px; color: #999;">
        Created by ${template.createdBy} on ${new Date(template.createdAt).toLocaleDateString()}
      </div>
      <button onclick="navigate('new-goal-from-template', '${template.id}')" style="margin-top: 12px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Create Goal from Template</button>
    </div>
  `).join('');
  
  return `
    <div class="card">
      <h2>📋 Templates</h2>
      <div style="margin: 16px 0;">
        <input type="text" id="template-search" placeholder="Search templates..." style="padding: 8px; width: 300px; margin-right: 8px;" oninput="handleTemplateSearch()" />
        <button onclick="navigate('goals')" style="margin-left: 8px;">← Back to Goals</button>
      </div>
    </div>
    ${templatesHtml}
  `;
}

function renderSelectTemplate(templates) {
  if (templates.length === 0) {
    return `
      <div class="card">
        <h2>Create Goal from Template</h2>
        <p>No templates available. Save a questline as a template first.</p>
        <button onclick="navigate('templates')">← Back to Templates</button>
      </div>
    `;
  }
  
  const templatesHtml = templates.map(template => `
    <div class="card" style="margin-bottom: 16px; cursor: pointer;" onclick="navigate('new-goal-from-template', '${template.id}')">
      <h3>${template.title}</h3>
      ${template.description ? `<p style="color: #666;">${template.description}</p>` : ''}
      ${template.tags && template.tags.length > 0 ? `
        <div style="margin: 8px 0;">
          ${template.tags.map(tag => `<span style="display: inline-block; padding: 2px 8px; background: #e3f2fd; color: #1976d2; border-radius: 12px; font-size: 11px; margin-right: 4px;">${tag}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
  
  return `
    <div class="card">
      <h2>Create Goal from Template</h2>
      <p>Select a template to create a new goal from:</p>
      <button onclick="navigate('goals')" style="margin-bottom: 16px;">← Back to Goals</button>
    </div>
    ${templatesHtml}
  `;
}

function renderNewGoalFromTemplate(templateData) {
  const { template, templateQuestline } = templateData;
  if (!template || !templateQuestline) {
    return '<div class="card"><p>Template not found.</p><button onclick="navigate(\'templates\')">← Back to Templates</button></div>';
  }
  
  const questCount = templateQuestline.questlineDefinition.quests.length;
  const taskCount = templateQuestline.questlineDefinition.quests.reduce((sum, q) => sum + q.tasks.length, 0);
  
  return `
    <div class="card">
      <h2>Create Goal from Template: ${template.title}</h2>
      ${template.description ? `<p style="color: #666; margin: 8px 0;">${template.description}</p>` : ''}
      <div style="margin: 12px 0; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <p><strong>Template includes:</strong> ${questCount} quests, ${taskCount} tasks</p>
      </div>
      
      <div style="margin-top: 20px;">
        <label><strong>Goal Title:</strong></label>
        <input type="text" id="goal-title-from-template" placeholder="Enter goal title..." style="width: 100%; padding: 8px; margin-top: 8px; margin-bottom: 16px;" />
        
        <label><strong>Goal Context (optional):</strong></label>
        <textarea id="goal-context" placeholder="Provide context about how this goal differs from the template..." style="width: 100%; padding: 8px; margin-top: 8px; margin-bottom: 16px; min-height: 80px;"></textarea>
        
        <label style="display: flex; align-items: center; margin: 16px 0;">
          <input type="checkbox" id="adapt-with-ai" style="margin-right: 8px;" />
          <strong>Adapt template with AI (SCOUT)</strong>
          <span style="color: #666; font-size: 12px; margin-left: 8px;">- Customize questline structure for your specific goal</span>
        </label>
        
        <div style="margin-top: 20px;">
          <button onclick="handleCreateGoalFromTemplate('${template.id}')" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">Create Goal</button>
          <button onclick="navigate('templates')" style="padding: 10px 20px; background: #ccc; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

window.handleSaveAsTemplate = async function(questlineId, goalId) {
  const title = prompt('Enter template name:');
  if (!title || !title.trim()) {
    return;
  }
  
  const description = prompt('Enter template description (optional):') || '';
  const tagsInput = prompt('Enter tags (comma-separated, optional):') || '';
  const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
  
  try {
    await saveQuestlineAsTemplate(questlineId, title.trim(), description.trim(), tags, currentUserId);
    alert('Template saved successfully!');
    navigate('questlines', goalId);
  } catch (error) {
    alert('Failed to save template: ' + error.message);
  }
};

window.handleCreateGoalFromTemplate = async function(templateId) {
  const goalTitle = document.getElementById('goal-title-from-template').value;
  if (!goalTitle || !goalTitle.trim()) {
    alert('Please enter a goal title');
    return;
  }
  
  const goalContext = document.getElementById('goal-context').value || '';
  const adaptWithAI = document.getElementById('adapt-with-ai').checked;
  
  try {
    const goal = await spawnGoalFromTemplate(templateId, goalTitle.trim(), goalContext.trim(), adaptWithAI);
    alert('Goal created successfully from template!');
    navigate('goal-detail', goal.id);
  } catch (error) {
    alert('Failed to create goal from template: ' + error.message);
  }
};

window.handleTemplateSearch = async function() {
  const searchQuery = document.getElementById('template-search')?.value || '';
  const templates = await fetchTemplates('default-org', searchQuery);
  const app = document.getElementById('app');
  const cards = app.querySelectorAll('.card');
  // Update templates list while keeping the search box
  const templatesHtml = templates.map(template => `
    <div class="card" style="margin-bottom: 16px;">
      <h3>${template.title}</h3>
      ${template.description ? `<p style="color: #666; margin: 8px 0;">${template.description}</p>` : ''}
      ${template.tags && template.tags.length > 0 ? `
        <div style="margin: 8px 0;">
          ${template.tags.map(tag => `<span style="display: inline-block; padding: 2px 8px; background: #e3f2fd; color: #1976d2; border-radius: 12px; font-size: 11px; margin-right: 4px;">${tag}</span>`).join('')}
        </div>
      ` : ''}
      <div style="margin-top: 12px; font-size: 12px; color: #999;">
        Created by ${template.createdBy} on ${new Date(template.createdAt).toLocaleDateString()}
      </div>
      <button onclick="navigate('new-goal-from-template', '${template.id}')" style="margin-top: 12px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Create Goal from Template</button>
    </div>
  `).join('');
  
  // Replace templates list (skip first card which is the header)
  const firstCard = cards[0];
  firstCard.outerHTML = firstCard.outerHTML;
  const remainingCards = Array.from(cards).slice(1);
  remainingCards.forEach(card => card.remove());
  app.insertAdjacentHTML('beforeend', templatesHtml);
};

function renderToday(data) {
  const { deck, blockedTasks, readyToUnlock, standup, teamPulse, lastQuestmasterRun } = data;
  
  // Limit deck to 3-7 tasks (show first few quests until we have 3-7 tasks)
  let deckTasks = [];
  let deckQuests = [];
  for (const entry of deck) {
    if (deckTasks.length >= 7) break;
    const entryTasks = entry.tasks.slice(0, 7 - deckTasks.length);
    deckTasks.push(...entryTasks);
    deckQuests.push({ ...entry, tasks: entryTasks });
  }
  
  // Format last questmaster run time
  let lastRunHtml = '<span style="color: #999;">Never</span>';
  if (lastQuestmasterRun) {
    const lastRun = new Date(lastQuestmasterRun);
    const now = new Date();
    const hoursAgo = Math.floor((now - lastRun) / (1000 * 60 * 60));
    const minutesAgo = Math.floor((now - lastRun) / (1000 * 60));
    
    if (minutesAgo < 60) {
      lastRunHtml = `<span style="color: #4CAF50;">${minutesAgo} min ago</span>`;
    } else if (hoursAgo < 24) {
      lastRunHtml = `<span style="color: #4CAF50;">${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago</span>`;
    } else {
      lastRunHtml = `<span style="color: #999;">${lastRun.toLocaleDateString()}</span>`;
    }
  }
  
  // Check if user is admin (for now, everyone can run questmaster - TODO: use actual role)
  const isAdmin = true;
  
  return `
    <div style="max-width: 1400px; margin: 0 auto;">
      <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="margin: 0; font-size: 32px;">📅 Today</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Your daily command center</p>
          </div>
          <div style="text-align: right;">
            ${isAdmin ? `
              <button onclick="handleRunQuestmaster()" style="padding: 10px 20px; background: rgba(255,255,255,0.2); color: white; border: 2px solid white; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 8px;">
                ⚡ Run Questmaster Now
              </button>
              <div style="font-size: 12px; opacity: 0.8;">
                Last run: ${lastRunHtml}
              </div>
            ` : `
              <div style="font-size: 12px; opacity: 0.8;">
                Last Questmaster run: ${lastRunHtml}
              </div>
            `}
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- My Deck -->
        <div class="card">
          <h2>🎯 My Deck</h2>
          ${deckQuests.length === 0 ? '<p style="color: #666;">No active quests. Complete some tasks to unlock more quests!</p>' : ''}
          ${deckQuests.map(entry => {
            const tasksHtml = entry.tasks.map(task => {
              const isCheckpoint = task.requiresApproval;
              const isCompleted = task.status === 'done';
              const isApproved = task.approvedAt && task.approvedBy;
              const needsApproval = isCheckpoint && isCompleted && !isApproved;
              
              let statusIcon = '⬜';
              if (isApproved) {
                statusIcon = '✅';
              } else if (isCompleted && isCheckpoint) {
                statusIcon = '⏳';
              } else if (isCompleted) {
                statusIcon = '✅';
              } else if (task.status === 'in-progress') {
                statusIcon = '⚙️';
              }
              
              return `
                <div class="task" style="margin: 8px 0; padding: 10px; border-left: 3px solid ${isCheckpoint ? '#ff9800' : isCompleted ? '#4CAF50' : task.status === 'in-progress' ? '#2196F3' : '#ddd'}; background: #f9f9f9;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                      <strong>${statusIcon} ${task.title}</strong>
                      ${isCheckpoint ? `<span style="margin-left: 8px; padding: 2px 6px; background: #ff9800; color: white; border-radius: 3px; font-size: 10px;">BOSS FIGHT</span>` : ''}
                      ${task.description ? `<p style="color: #666; font-size: 12px; margin: 4px 0;">${task.description}</p>` : ''}
                    </div>
                    <div>
                      ${task.status !== 'done' ? `<button onclick="handleCompleteTask('${task.id}', 'today')" style="padding: 6px 12px; font-size: 12px; margin-right: 4px;">Complete</button>` : ''}
                      ${needsApproval ? `<button onclick="handleApproveTask('${task.id}', 'today')" style="padding: 6px 12px; font-size: 12px; background: #4CAF50; color: white;">Approve</button>` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
            
            return `
              <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                <h4 style="margin: 0 0 8px 0;">${entry.quest.title}</h4>
                <p style="color: #666; font-size: 13px; margin: 0 0 12px 0;">${entry.quest.objective}</p>
                ${tasksHtml}
                <div style="margin-top: 8px; font-size: 11px; color: #999;">
                  ~${Math.round(entry.totalEstimatedMinutes / 60 * 10) / 10} hours
                </div>
              </div>
            `;
          }).join('')}
          ${deck.length > deckQuests.length ? `<p style="color: #666; font-size: 12px; margin-top: 12px;">+ ${deck.length - deckQuests.length} more quest${deck.length - deckQuests.length !== 1 ? 's' : ''} in your deck</p>` : ''}
        </div>
        
        <!-- Blockers I Own -->
        <div class="card">
          <h2>🚫 Blockers I Own</h2>
          ${blockedTasks.length === 0 ? '<p style="color: #666;">No blockers! You\'re all clear.</p>' : ''}
          ${blockedTasks.map(task => `
            <div style="margin: 8px 0; padding: 12px; border-left: 3px solid #f44336; background: #ffebee;">
              <strong>${task.title}</strong>
              ${task.description ? `<p style="color: #666; font-size: 12px; margin: 4px 0;">${task.description}</p>` : ''}
              <div style="margin-top: 8px;">
                <strong style="color: #d32f2f; font-size: 12px;">Blockers:</strong>
                <ul style="margin: 4px 0; padding-left: 20px; color: #666; font-size: 12px;">
                  ${task.blockers.map(blocker => `<li>${blocker}</li>`).join('')}
                </ul>
              </div>
              <button onclick="navigate('history', 'task', '${task.id}')" style="margin-top: 8px; padding: 4px 8px; font-size: 11px; background: #f5f5f5;">View Details</button>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Quests Ready to Unlock -->
        <div class="card">
          <h2>⏳ Ready to Unlock</h2>
          ${readyToUnlock.length === 0 ? '<p style="color: #666;">No quests ready to unlock.</p>' : ''}
          ${readyToUnlock.map(quest => {
            const unlockReason = getUnlockReason(quest);
            return `
              <div style="margin: 8px 0; padding: 12px; border: 1px solid #4CAF50; border-radius: 4px; background: #e8f5e9;">
                <h4 style="margin: 0 0 4px 0;">🔓 ${quest.title}</h4>
                <p style="color: #666; font-size: 13px; margin: 4px 0;">${quest.objective}</p>
                <p style="color: #2e7d32; font-size: 11px; margin: 4px 0;"><strong>Almost ready:</strong> ${unlockReason}</p>
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- Standup Summary -->
        <div class="card">
          <h2>📊 Standup Summary</h2>
          <div style="margin: 12px 0;">
            <h4 style="margin: 0 0 8px 0; color: #4CAF50;">✅ Completed Yesterday (${standup.completedYesterday.length})</h4>
            ${standup.completedYesterday.length === 0 ? '<p style="color: #999; font-size: 12px; margin: 4px 0;">Nothing completed yesterday</p>' : ''}
            ${standup.completedYesterday.map(task => `
              <div style="margin: 4px 0; padding: 6px; background: #f1f8e9; border-radius: 4px;">
                <span style="font-size: 13px;">✅ ${task.title}</span>
              </div>
            `).join('')}
          </div>
          
          <div style="margin: 12px 0;">
            <h4 style="margin: 0 0 8px 0; color: #2196F3;">⚙️ Doing Today (${standup.doingToday.length})</h4>
            ${standup.doingToday.length === 0 ? '<p style="color: #999; font-size: 12px; margin: 4px 0;">No tasks in progress</p>' : ''}
            ${standup.doingToday.map(task => `
              <div style="margin: 4px 0; padding: 6px; background: #e3f2fd; border-radius: 4px;">
                <span style="font-size: 13px;">⚙️ ${task.title}</span>
              </div>
            `).join('')}
          </div>
          
          <div style="margin: 12px 0;">
            <h4 style="margin: 0 0 8px 0; color: #f44336;">🚫 Blocked (${standup.blocked.length})</h4>
            ${standup.blocked.length === 0 ? '<p style="color: #999; font-size: 12px; margin: 4px 0;">No blockers</p>' : ''}
            ${standup.blocked.map(task => `
              <div style="margin: 4px 0; padding: 6px; background: #ffebee; border-radius: 4px;">
                <span style="font-size: 13px;">🚫 ${task.title}</span>
                ${task.blockers && task.blockers.length > 0 ? `
                  <div style="font-size: 11px; color: #666; margin-top: 4px;">
                    ${task.blockers.join(', ')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <!-- Team Pulse -->
      <div class="card">
        <h2>👥 Team Pulse</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 16px;">
          ${teamPulse.map(member => {
            const capacityPercent = Math.min((member.capacityUsed / member.capacityTotal) * 100, 100);
            const capacityColor = capacityPercent > 100 ? '#d32f2f' : capacityPercent > 80 ? '#ff9800' : '#4CAF50';
            
            return `
              <div style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong>${member.memberEmail}</strong>
                  ${member.blockersCount > 0 ? `<span style="padding: 2px 8px; background: #ffebee; color: #d32f2f; border-radius: 12px; font-size: 11px;">${member.blockersCount} blocker${member.blockersCount !== 1 ? 's' : ''}</span>` : ''}
                </div>
                
                <div style="margin: 8px 0;">
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                    <span>Capacity</span>
                    <span style="color: ${capacityColor};">${Math.round(capacityPercent)}%</span>
                  </div>
                  <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: ${capacityColor}; height: 100%; width: ${Math.min(capacityPercent, 100)}%;"></div>
                  </div>
                  <div style="font-size: 11px; color: #666; margin-top: 2px;">
                    ${Math.round(member.capacityUsed / 60 * 10) / 10}h / ${Math.round(member.capacityTotal / 60 * 10) / 10}h
                  </div>
                </div>
                
                ${member.activeQuestTitle ? `
                  <div style="margin-top: 8px; font-size: 12px; color: #666;">
                    <strong>Active Quest:</strong> ${member.activeQuestTitle}
                  </div>
                ` : '<div style="margin-top: 8px; font-size: 12px; color: #999;">No active quest</div>'}
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <div style="margin-top: 20px;">
        <button onclick="navigate('goals')">← Back to Goals</button>
      </div>
    </div>
  `;
}

// Initial render
render();

