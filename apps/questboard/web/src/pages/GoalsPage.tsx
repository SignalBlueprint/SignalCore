import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

interface Goal {
  id: string;
  orgId?: string;
  title: string;
  level?: number;
  status: string;
  parentGoalId?: string | null;
  outcome?: string | null;
  successMetric?: string | null;
  targetValue?: string | null;
  dueDate?: string | null;
  planMarkdown?: string | null;
  playbookMarkdown?: string | null;
  ownerUserId?: string | null;
  orderIndex?: number;
  createdAt: string;
  updatedAt?: string;
  // Strategic Packets fields
  scope_level?: "company" | "program" | "team" | "individual";
  owner_role_id?: string | null;
  problem?: string | null;
  spec_json?: any;
  // Legacy fields for backward compatibility
  clarifyOutput?: any;
  decomposeOutput?: any;
  approvedAt?: string;
  deniedAt?: string;
  denialReason?: string;
  decomposedAt?: string;
  summary?: string | null;
}

interface Milestone {
  id: string;
  goalId: string;
  title: string;
  dueDate?: string | null;
  status: string;
  orderIndex: number;
}

interface GoalRollup {
  goalId: string;
  totalQuests: number;
  doneQuests: number;
  xp: number;
}

interface LevelUpResponse {
  next_level: number;
  goal_updates: {
    outcome?: string;
    success_metric?: string;
    target_value?: string;
    plan_markdown?: string;
    playbook_markdown?: string;
    risks?: string[];
    dependencies?: string[];
  };
  milestones?: Array<{ title: string; due_date?: string }>;
  quests?: Array<{ title: string; objective: string; priority?: string; points?: number }>;
  child_goals?: Array<{ title: string; level: number }>;
  assumptions?: string[];
}

export default function GoalsPage() {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId?: string }>();
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get('orgId') || 'default-org';

  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goalPath, setGoalPath] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [rollup, setRollup] = useState<GoalRollup | null>(null);
  const [children, setChildren] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [levelUpResponse, setLevelUpResponse] = useState<LevelUpResponse | null>(null);
  const [levelingUp, setLevelingUp] = useState(false);
  const [applyingLevelUp, setApplyingLevelUp] = useState(false);
  const [improveResponse, setImproveResponse] = useState<any | null>(null);
  const [improving, setImproving] = useState(false);
  const [applyingImprove, setApplyingImprove] = useState(false);

  useEffect(() => {
    fetchGoalTree();
  }, [orgId]);

  useEffect(() => {
    if (goalId) {
      fetchGoalDetails(goalId);
    } else {
      setSelectedGoal(null);
      setGoalPath([]);
      setMilestones([]);
      setRollup(null);
      setChildren([]);
    }
  }, [goalId]);

  const fetchGoalTree = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try goals-tree first, fallback to goals if it fails
      let response = await fetch(`/api/goals-tree?orgId=${orgId}`);
      if (!response.ok) {
        // Fallback to old endpoint
        response = await fetch(`/api/goals`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      // Ensure all goals have default hierarchical fields
      const normalizedGoals = data.map((g: Goal) => ({
        ...g,
        level: g.level ?? 0,
        status: g.status ?? 'active',
        parentGoalId: g.parentGoalId ?? null,
        orderIndex: g.orderIndex ?? 0,
      }));
      setGoals(normalizedGoals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
      console.error('Fetch goals error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoalDetails = async (id: string) => {
    try {
      const [goalRes, pathRes, milestonesRes, rollupRes, childrenRes] = await Promise.all([
        fetch(`/api/goals/${id}`),
        fetch(`/api/goals/${id}/path`).catch(() => ({ ok: false })), // Optional
        fetch(`/api/goals/${id}/milestones`).catch(() => ({ ok: false })), // Optional
        fetch(`/api/goals/${id}/rollup`).catch(() => ({ ok: false })), // Optional
        fetch(`/api/goals/${id}/children`).catch(() => ({ ok: false })), // Optional
      ]);

      if (!goalRes.ok) throw new Error(`HTTP ${goalRes.status}`);
      const goal = await goalRes.json();
      // Normalize goal fields
      const normalizedGoal = {
        ...goal,
        level: goal.level ?? 0,
        status: goal.status ?? 'active',
        parentGoalId: goal.parentGoalId ?? null,
        orderIndex: goal.orderIndex ?? 0,
      };
      setSelectedGoal(normalizedGoal);

      if (pathRes.ok) {
        const path = await pathRes.json();
        setGoalPath(path);
      } else {
        setGoalPath([]);
      }

      if (milestonesRes.ok) {
        const ms = await milestonesRes.json();
        setMilestones(ms);
      } else {
        setMilestones([]);
      }

      if (rollupRes.ok) {
        const r = await rollupRes.json();
        setRollup(r);
      } else {
        setRollup(null);
      }

      if (childrenRes.ok) {
        const ch = await childrenRes.json();
        setChildren(ch);
      } else {
        setChildren([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goal details');
      console.error('Fetch goal details error:', err);
    }
  };

  const createGoal = async (parentId?: string | null) => {
    if (!newGoalTitle.trim()) {
      alert('Please enter a goal title');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const response = await fetch('/api/goals-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          title: newGoalTitle.trim(),
          parentGoalId: parentId || null,
          level: 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}: ${errorText}`;
        console.error('Create goal API error:', response.status, errorData);
        throw new Error(errorMessage);
      }
      const goal = await response.json();
      
      setNewGoalTitle('');
      setShowCreateForm(false);
      await fetchGoalTree();
      navigate(`/goals/${goal.id}?orgId=${orgId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Create goal error:', err);
      setError(`Failed to create goal: ${errorMessage}`);
      alert(`Failed to create goal: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  const handleLevelUp = async () => {
    if (!selectedGoal) return;

    try {
      setLevelingUp(true);
      setError(null);
      const response = await fetch(`/api/goals/${selectedGoal.id}/level-up`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}: ${errorText}`;
        console.error('Level up API error:', response.status, errorData, errorText);
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setLevelUpResponse(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Level up error:', err);
      setError(`Failed to level up goal: ${errorMessage}`);
      alert(`Failed to level up goal: ${errorMessage}`);
    } finally {
      setLevelingUp(false);
    }
  };

  const handleApplyLevelUp = async () => {
    if (!selectedGoal || !levelUpResponse) return;

    try {
      setApplyingLevelUp(true);
      const response = await fetch(`/api/goals/${selectedGoal.id}/apply-level-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelUpResponse }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      
      setLevelUpResponse(null);
      await fetchGoalDetails(selectedGoal.id);
      await fetchGoalTree();
      alert(`Level up applied! Created ${result.milestonesCreated} milestones, ${result.questsCreated} quests, ${result.childGoalsCreated} child goals.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to apply level up: ${errorMessage}`);
    } finally {
      setApplyingLevelUp(false);
    }
  };

  const handleImproveGoal = async () => {
    if (!selectedGoal) return;

    try {
      setImproving(true);
      setError(null);
      const response = await fetch(`/api/goals/${selectedGoal.id}/improve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}: ${errorText}`;
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setImproveResponse(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Improve goal error:', err);
      setError(`Failed to improve goal: ${errorMessage}`);
      alert(`Failed to improve goal: ${errorMessage}`);
    } finally {
      setImproving(false);
    }
  };

  const handleApplyImprove = async () => {
    if (!selectedGoal || !improveResponse) return;

    try {
      setApplyingImprove(true);
      const response = await fetch(`/api/goals/${selectedGoal.id}/apply-improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ improved: improveResponse }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      
      setImproveResponse(null);
      await fetchGoalDetails(selectedGoal.id);
      await fetchGoalTree();
      alert(`Goal improved! Updated structure and created ${result.milestonesCreated} milestones.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to apply improvements: ${errorMessage}`);
    } finally {
      setApplyingImprove(false);
    }
  };

  const buildGoalTree = (parentId: string | null = null): Goal[] => {
    return goals
      .filter(g => g.parentGoalId === parentId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  };

  // Get a one-line summary for a goal
  const getGoalSummary = (goal: Goal): string => {
    // Try to get a concise summary from various sources
    if (goal.summary) return goal.summary;
    if (goal.outcome) {
      // Truncate outcome to one sentence
      const sentences = goal.outcome.split(/[.!?]+/).filter(s => s.trim());
      return sentences[0]?.trim() || goal.outcome.substring(0, 100);
    }
    if (goal.spec_json?.outcome) {
      const sentences = goal.spec_json.outcome.split(/[.!?]+/).filter(s => s.trim());
      return sentences[0]?.trim() || goal.spec_json.outcome.substring(0, 100);
    }
    if (goal.problem) {
      const sentences = goal.problem.split(/[.!?]+/).filter(s => s.trim());
      return sentences[0]?.trim() || goal.problem.substring(0, 100);
    }
    // Fallback to title if nothing else
    return goal.title;
  };

  const renderGoalTree = (parentId: string | null = null, depth: number = 0): JSX.Element[] => {
    const treeGoals = buildGoalTree(parentId);
    return treeGoals.map(goal => {
      const summary = getGoalSummary(goal);
      const scopeLevel = goal.scope_level || (goal.level === 0 ? 'company' : goal.level === 1 ? 'program' : goal.level === 2 ? 'team' : 'individual');
      
      return (
        <div key={goal.id} style={{ marginLeft: `${depth * 16}px`, marginBottom: '4px' }}>
          <div
            onClick={() => navigate(`/goals/${goal.id}?orgId=${orgId}`)}
            style={{
              padding: '8px 12px',
              background: selectedGoal?.id === goal.id ? '#e3f2fd' : '#ffffff',
              borderRadius: '4px',
              border: selectedGoal?.id === goal.id ? '2px solid #0066cc' : '1px solid #e0e0e0',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (selectedGoal?.id !== goal.id) {
                e.currentTarget.style.background = '#f5f5f5';
                e.currentTarget.style.borderColor = '#0066cc';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedGoal?.id !== goal.id) {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {goal.title}
                </span>
                {scopeLevel && (
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '10px',
                      background: scopeLevel === 'company' ? '#9C27B0' : scopeLevel === 'program' ? '#2196F3' : scopeLevel === 'team' ? '#4CAF50' : '#FF9800',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    {scopeLevel.charAt(0)}
                  </span>
                )}
                {goal.status && (
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '10px',
                      background: goal.status === 'active' ? '#4CAF50' : goal.status === 'ready' ? '#2196F3' : goal.status === 'done' ? '#9C27B0' : '#999',
                      color: 'white',
                      fontSize: '10px',
                      flexShrink: 0,
                    }}
                  >
                    {goal.status}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {summary}
              </div>
            </div>
            <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px', flexShrink: 0 }}>→</span>
          </div>
          {renderGoalTree(goal.id, depth + 1)}
        </div>
      );
    });
  };

  const getLevelName = (level: number): string => {
    const names = ['Draft', 'Defined', 'Planned', 'Resourced', 'Operational', 'Strategic'];
    return names[level] || `Level ${level}`;
  };

  if (loading && goals.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading goals...</p>
      </div>
    );
  }

  // Goal detail view
  if (selectedGoal) {
    return (
      <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
        {/* Left: Tree View */}
        <div style={{ width: '300px', overflowY: 'auto', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Goal Tree</h3>
            <button
              onClick={() => navigate(`/goals?orgId=${orgId}`)}
              style={{
                padding: '6px 12px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ← Back
            </button>
          </div>
          {renderGoalTree()}
        </div>

        {/* Right: Goal Detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          {/* Breadcrumb */}
          {goalPath.length > 0 && (
            <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
              {goalPath.map((g, i) => (
                <span key={g.id}>
                  {i > 0 && ' → '}
                  <span
                    onClick={() => navigate(`/goals/${g.id}?orgId=${orgId}`)}
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {g.title}
                  </span>
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>{selectedGoal.title}</h2>
              <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: '#0066cc',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {getLevelName(selectedGoal.level || 0)}
                </span>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: selectedGoal.status === 'active' ? '#4CAF50' : '#999',
                    color: 'white',
                    fontSize: '12px',
                  }}
                >
                  {selectedGoal.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/goals?orgId=${orgId}`)}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ← Back to Tree
            </button>
          </div>

          {/* Progress */}
          {rollup && (
            <div style={{ marginBottom: '20px', padding: '16px', background: '#f0f8ff', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Progress</h3>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
                <span>Quests: {rollup.doneQuests} / {rollup.totalQuests}</span>
                <span>XP: {rollup.xp}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#ddd', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${rollup.totalQuests > 0 ? (rollup.doneQuests / rollup.totalQuests) * 100 : 0}%`,
                    height: '100%',
                    background: '#4CAF50',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleImproveGoal}
              disabled={improving}
              style={{
                padding: '12px 24px',
                background: improving ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: improving ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              {improving ? 'Improving...' : '✨ Improve Goal Structure'}
            </button>
            {(selectedGoal.level || 0) < 5 && (
              <button
                onClick={handleLevelUp}
                disabled={levelingUp}
                style={{
                  padding: '12px 24px',
                  background: levelingUp ? '#ccc' : '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: levelingUp ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                {levelingUp ? 'Leveling Up...' : `⬆️ Level Up (L${selectedGoal.level || 0} → L${(selectedGoal.level || 0) + 1})`}
              </button>
            )}
          </div>

          {/* Improve Goal Preview */}
          {improveResponse && (
            <div style={{ marginBottom: '20px', padding: '20px', background: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196F3' }}>
              <h3 style={{ marginTop: 0 }}>✨ Improved Goal Structure (Preview)</h3>
              <p style={{ color: '#666' }}>Review the improved structure below. Click "Apply" to update the goal.</p>
              
              <div style={{ marginBottom: '16px' }}>
                <strong>Improved Title:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#333', fontSize: '16px', fontWeight: '500' }}>{improveResponse.improved_title}</p>
              </div>

              {improveResponse.summary && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Summary:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#666' }}>{improveResponse.summary}</p>
                </div>
              )}

              {improveResponse.improved_problem && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Problem:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#666' }}>{improveResponse.improved_problem}</p>
                </div>
              )}

              {improveResponse.improved_outcome && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Outcome:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#666' }}>{improveResponse.improved_outcome}</p>
                </div>
              )}

              {improveResponse.metrics && improveResponse.metrics.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Metrics ({improveResponse.metrics.length}):</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', color: '#666' }}>
                    {improveResponse.metrics.map((m: any, i: number) => (
                      <li key={i}>{m.name}: {m.target} ({m.window})</li>
                    ))}
                  </ul>
                </div>
              )}

              {improveResponse.milestones && improveResponse.milestones.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Milestones ({improveResponse.milestones.length}):</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', color: '#666' }}>
                    {improveResponse.milestones.map((m: any, i: number) => (
                      <li key={i}>{m.title} {m.due_date && `(due: ${m.due_date})`}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={handleApplyImprove}
                  disabled={applyingImprove}
                  style={{
                    padding: '10px 20px',
                    background: applyingImprove ? '#ccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: applyingImprove ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {applyingImprove ? 'Applying...' : '✅ Apply Improvements'}
                </button>
                <button
                  onClick={() => setImproveResponse(null)}
                  disabled={applyingImprove}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: applyingImprove ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Level Up Preview */}
          {levelUpResponse && (
            <div style={{ marginBottom: '20px', padding: '20px', background: '#fff3cd', borderRadius: '8px', border: '2px solid #ffc107' }}>
              <h3 style={{ marginTop: 0 }}>Level Up Preview (Draft)</h3>
              <p style={{ color: '#666' }}>Review the generated content below. Click "Apply" to create milestones, quests, and update the goal.</p>
              
              {levelUpResponse.summary && levelUpResponse.summary.trim() && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Summary:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#666' }}>{levelUpResponse.summary}</p>
                </div>
              )}

              {levelUpResponse.goal_updates.outcome && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Outcome:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#666' }}>{levelUpResponse.goal_updates.outcome}</p>
                </div>
              )}

              {levelUpResponse.goal_updates.success_metric && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Success Metric:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#666' }}>{levelUpResponse.goal_updates.success_metric}</p>
                </div>
              )}

              {levelUpResponse.milestones && levelUpResponse.milestones.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Milestones ({levelUpResponse.milestones.length}):</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', color: '#666' }}>
                    {levelUpResponse.milestones.map((m, i) => (
                      <li key={i}>{m.title} {m.due_date && `(due: ${m.due_date})`}</li>
                    ))}
                  </ul>
                </div>
              )}

              {levelUpResponse.quests && levelUpResponse.quests.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Starter Quests ({levelUpResponse.quests.length}):</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', color: '#666' }}>
                    {levelUpResponse.quests.map((q, i) => (
                      <li key={i}>{q.title} - {q.objective}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={handleApplyLevelUp}
                  disabled={applyingLevelUp}
                  style={{
                    padding: '10px 20px',
                    background: applyingLevelUp ? '#ccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: applyingLevelUp ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {applyingLevelUp ? 'Applying...' : '✅ Apply Level Up'}
                </button>
                <button
                  onClick={() => setLevelUpResponse(null)}
                  disabled={applyingLevelUp}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: applyingLevelUp ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Goal Details */}
          <div style={{ marginBottom: '20px' }}>
            <h3>Details</h3>
            {selectedGoal.summary && (
              <div style={{ marginBottom: '12px' }}>
                <strong>Summary:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>{selectedGoal.summary}</p>
              </div>
            )}
            {selectedGoal.outcome && (
              <div style={{ marginBottom: '12px' }}>
                <strong>Outcome:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>{selectedGoal.outcome}</p>
              </div>
            )}
            {selectedGoal.successMetric && (
              <div style={{ marginBottom: '12px' }}>
                <strong>Success Metric:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>{selectedGoal.successMetric}</p>
              </div>
            )}
            {selectedGoal.planMarkdown && (
              <div style={{ marginBottom: '12px' }}>
                <strong>Plan:</strong>
                <div style={{ margin: '4px 0 0 0', color: '#666', whiteSpace: 'pre-wrap' }}>{selectedGoal.planMarkdown}</div>
              </div>
            )}
          </div>

          {/* Milestones */}
          {milestones.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3>Milestones</h3>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                {milestones.map(m => (
                  <li key={m.id} style={{ marginBottom: '8px' }}>
                    {m.title} {m.dueDate && `(due: ${m.dueDate})`} - {m.status}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Child Goals */}
          {children.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3>Child Goals</h3>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                {children.map(c => (
                  <li key={c.id} style={{ marginBottom: '8px' }}>
                    <span
                      onClick={() => navigate(`/goals/${c.id}?orgId=${orgId}`)}
                      style={{ cursor: 'pointer', textDecoration: 'underline', color: '#0066cc' }}
                    >
                      {c.title}
                    </span>
                    {' '}
                    <span style={{ fontSize: '12px', color: '#666' }}>L{c.level || 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Goals tree view
  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '32px', margin: 0 }}>🎯 Goals</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
          style={{
            padding: '10px 20px',
            background: showCreateForm ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: showCreateForm ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          + New Goal
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '20px', padding: '12px', background: '#ffebee', borderRadius: '4px', color: '#d32f2f' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Create Goal Form */}
      {showCreateForm && (
        <div style={{ marginBottom: '30px', padding: '20px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #0066cc' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Create New Goal</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="Enter goal title"
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createGoal();
                } else if (e.key === 'Escape') {
                  setShowCreateForm(false);
                  setNewGoalTitle('');
                }
              }}
              autoFocus
            />
            <button
              onClick={() => createGoal()}
              disabled={creating || !newGoalTitle.trim()}
              style={{
                padding: '10px 20px',
                background: creating || !newGoalTitle.trim() ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: creating || !newGoalTitle.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewGoalTitle('');
              }}
              disabled={creating}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: creating ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Goals Tree */}
      {goals.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>No goals yet.</p>
          <p>Create your first organizational goal to get started!</p>
        </div>
      ) : (
        <div>{renderGoalTree()}</div>
      )}
    </div>
  );
}
