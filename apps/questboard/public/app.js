// Simple client-side router and UI
const API_BASE = '/api';

let currentView = 'goals';
let currentGoalId = null;

// Router
function navigate(view, goalId = null) {
  currentView = view;
  currentGoalId = goalId;
  render();
  window.location.hash = view + (goalId ? `/${goalId}` : '');
}

// Hash change handler
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  const parts = hash.split('/');
  if (parts[0] === 'goals' && parts[1]) {
    navigate('goal-detail', parts[1]);
  } else if (parts[0] === 'goals' && parts[2] === 'questlines') {
    navigate('questlines', parts[1]);
  } else if (parts[0] === 'new-goal') {
    navigate('new-goal');
  } else {
    navigate('goals');
  }
});

// Initialize
if (window.location.hash) {
  window.dispatchEvent(new Event('hashchange'));
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
  const clarifyBtn = goal.status === 'draft' || goal.status === 'clarifying' 
    ? `<button onclick="clarify('${goal.id}')" ${goal.clarifyOutput ? 'disabled' : ''}>Clarify Goal</button>`
    : '';
  
  const approveBtn = goal.clarifyOutput && goal.status === 'clarifying'
    ? `<button onclick="approve('${goal.id}')">Approve Clarification</button>`
    : '';
  
  const decomposeBtn = goal.status === 'approved'
    ? `<button onclick="decompose('${goal.id}')">Decompose into Questlines</button>`
    : '';
  
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

  return `
    <div class="card">
      <h2>${goal.title}</h2>
      <span class="status ${goal.status}">${goal.status}</span>
      ${clarifyBtn}
      ${approveBtn}
      ${decomposeBtn}
      ${questlinesBtn}
    </div>
    ${clarifySection}
    <div><a href="#goals">← Back to Goals</a></div>
  `;
}

function renderQuestlines(goal) {
  if (!goal.decomposeOutput || !goal.decomposeOutput.questlines) {
    return '<div class="card"><p>No questlines yet. Decompose the goal first.</p></div>';
  }

  const questlines = goal.decomposeOutput.questlines
    .sort((a, b) => a.order - b.order)
    .map(q => `
      <div class="questline ${q.locked ? 'locked' : ''}">
        <h3>${q.locked ? '🔒 ' : ''}${q.title}</h3>
        <p>${q.description}</p>
        <small>Order: ${q.order}${q.prerequisiteIds && q.prerequisiteIds.length > 0 ? ` | Prerequisites: ${q.prerequisiteIds.join(', ')}` : ''}</small>
      </div>
    `).join('');

  return `
    <div class="card">
      <h2>Questlines for: ${goal.title}</h2>
      <p>Complexity: ${goal.decomposeOutput.estimatedComplexity}</p>
    </div>
    ${questlines}
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
        <button onclick="navigate('new-goal')">+ New Goal</button>
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

window.decompose = async function(id) {
  await decomposeGoal(id);
  navigate('goal-detail', id);
};

window.navigate = navigate;

// Initial render
render();

