import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface Goal {
  id: string;
  title: string;
  orgId?: string;
  status: 'draft' | 'clarified_pending_approval' | 'approved' | 'denied' | 'decomposed';
  clarifyOutput?: {
    goal: string;
    clarified: {
      what: string;
      why: string;
      success: string;
      constraints: string[];
    };
  };
  decomposeOutput?: any;
  createdAt: string;
  approvedAt?: string;
  deniedAt?: string;
  denialReason?: string;
  decomposedAt?: string;
}

export default function GoalsPage() {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId?: string }>();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null); // Track which action is processing
  const [denialReason, setDenialReason] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    if (goalId) {
      fetchGoal(goalId);
    } else {
      setSelectedGoal(null);
    }
  }, [goalId]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/goals');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoal = async (id: string) => {
    try {
      const response = await fetch(`/api/goals/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSelectedGoal(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goal');
    }
  };

  const createGoal = async () => {
    if (!newGoalTitle.trim()) {
      alert('Please enter a goal title');
      return;
    }

    // Get orgId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('orgId') || 'default-org';

    try {
      setCreating(true);
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGoalTitle.trim(),
          orgId,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const goal = await response.json();
      
      setNewGoalTitle('');
      setShowCreateForm(false);
      await fetchGoals();
      navigate(`/goals/${goal.id}`);
    } catch (err) {
      alert(`Failed to create goal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const clarifyGoal = async (id: string) => {
    try {
      setProcessing(`clarify-${id}`);
      const response = await fetch(`/api/goals/${id}/clarify`, { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }
      await fetchGoal(id);
      await fetchGoals();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to clarify goal: ${errorMessage}`);
    } finally {
      setProcessing(null);
    }
  };

  const approveGoal = async (id: string) => {
    try {
      setProcessing(`approve-${id}`);
      const response = await fetch(`/api/goals/${id}/approve`, { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await fetchGoal(id);
      await fetchGoals();
    } catch (err) {
      alert(`Failed to approve goal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessing(null);
    }
  };

  const denyGoal = async (id: string) => {
    if (!denialReason.trim()) {
      alert('Please provide a denial reason');
      return;
    }

    try {
      setProcessing(`deny-${id}`);
      const response = await fetch(`/api/goals/${id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: denialReason.trim() }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setDenialReason('');
      await fetchGoal(id);
      await fetchGoals();
    } catch (err) {
      alert(`Failed to deny goal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessing(null);
    }
  };

  const decomposeGoal = async (id: string) => {
    try {
      setProcessing(`decompose-${id}`);
      const response = await fetch(`/api/goals/${id}/decompose`, { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      await fetchGoal(id);
      await fetchGoals();
      
      // Navigate to assignment review if tasks were created
      if (result.createdTasks > 0) {
        navigate(`/goals/${id}/assignment-review`);
      }
    } catch (err) {
      alert(`Failed to decompose goal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#999';
      case 'clarified_pending_approval': return '#ff9800';
      case 'approved': return '#4CAF50';
      case 'denied': return '#f44336';
      case 'decomposed': return '#2196F3';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'clarified_pending_approval': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'denied': return 'Denied';
      case 'decomposed': return 'Decomposed';
      default: return status;
    }
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
      <div
        style={{
          background: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ fontSize: '32px', margin: 0 }}>{selectedGoal.title}</h2>
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  background: getStatusColor(selectedGoal.status),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {getStatusLabel(selectedGoal.status)}
              </span>
              <span style={{ fontSize: '14px', color: '#666' }}>
                Created: {new Date(selectedGoal.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/goals')}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ← Back to Goals
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ marginBottom: '30px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {selectedGoal.status === 'draft' && (
            <button
              onClick={() => clarifyGoal(selectedGoal.id)}
              disabled={processing === `clarify-${selectedGoal.id}`}
              style={{
                padding: '10px 20px',
                background: processing === `clarify-${selectedGoal.id}` ? '#ccc' : '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: processing === `clarify-${selectedGoal.id}` ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {processing === `clarify-${selectedGoal.id}` ? 'Clarifying...' : '🔍 Clarify Goal'}
            </button>
          )}

          {(selectedGoal.status === 'clarified_pending_approval' || selectedGoal.status === 'approved') && (
            <button
              onClick={() => clarifyGoal(selectedGoal.id)}
              disabled={processing === `clarify-${selectedGoal.id}`}
              style={{
                padding: '10px 20px',
                background: processing === `clarify-${selectedGoal.id}` ? '#ccc' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: processing === `clarify-${selectedGoal.id}` ? 'not-allowed' : 'pointer',
              }}
            >
              {processing === `clarify-${selectedGoal.id}` ? 'Re-clarifying...' : 'Re-clarify'}
            </button>
          )}

          {selectedGoal.status === 'clarified_pending_approval' && (
            <>
              <button
                onClick={() => approveGoal(selectedGoal.id)}
                disabled={processing === `approve-${selectedGoal.id}`}
                style={{
                  padding: '10px 20px',
                  background: processing === `approve-${selectedGoal.id}` ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing === `approve-${selectedGoal.id}` ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {processing === `approve-${selectedGoal.id}` ? 'Approving...' : '✅ Approve'}
              </button>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  placeholder="Denial reason..."
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minWidth: '200px',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      denyGoal(selectedGoal.id);
                    }
                  }}
                />
                <button
                  onClick={() => denyGoal(selectedGoal.id)}
                  disabled={processing === `deny-${selectedGoal.id}` || !denialReason.trim()}
                  style={{
                    padding: '10px 20px',
                    background: processing === `deny-${selectedGoal.id}` || !denialReason.trim() ? '#ccc' : '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: processing === `deny-${selectedGoal.id}` || !denialReason.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {processing === `deny-${selectedGoal.id}` ? 'Denying...' : '❌ Deny'}
                </button>
              </div>
            </>
          )}

          {selectedGoal.status === 'approved' && (
            <button
              onClick={() => decomposeGoal(selectedGoal.id)}
              disabled={processing === `decompose-${selectedGoal.id}`}
              style={{
                padding: '10px 20px',
                background: processing === `decompose-${selectedGoal.id}` ? '#ccc' : '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: processing === `decompose-${selectedGoal.id}` ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              {processing === `decompose-${selectedGoal.id}` ? 'Decomposing...' : '⚡ Decompose into Questlines'}
            </button>
          )}

          {selectedGoal.status === 'decomposed' && (
            <button
              onClick={() => navigate(`/goals/${selectedGoal.id}/assignment-review`)}
              style={{
                padding: '10px 20px',
                background: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              📋 View Assignment Review
            </button>
          )}
        </div>

        {/* Clarification Output */}
        {selectedGoal.clarifyOutput && (
          <div style={{ marginBottom: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Clarification</h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <strong>What:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>{selectedGoal.clarifyOutput.clarified.what}</p>
              </div>
              <div>
                <strong>Why:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>{selectedGoal.clarifyOutput.clarified.why}</p>
              </div>
              <div>
                <strong>Success Criteria:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>{selectedGoal.clarifyOutput.clarified.success}</p>
              </div>
              <div>
                <strong>Constraints:</strong>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', color: '#666' }}>
                  {selectedGoal.clarifyOutput.clarified.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Denial Reason */}
        {selectedGoal.status === 'denied' && selectedGoal.denialReason && (
          <div style={{ marginBottom: '30px', padding: '20px', background: '#ffebee', borderRadius: '8px', border: '1px solid #f44336' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#d32f2f' }}>Denial Reason</h3>
            <p style={{ color: '#666' }}>{selectedGoal.denialReason}</p>
            {selectedGoal.deniedAt && (
              <small style={{ color: '#999' }}>
                Denied at: {new Date(selectedGoal.deniedAt).toLocaleString()}
              </small>
            )}
          </div>
        )}

        {/* Decomposition Info */}
        {selectedGoal.status === 'decomposed' && selectedGoal.decomposeOutput && (
          <div style={{ marginBottom: '30px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Decomposition Complete</h3>
            <p style={{ color: '#666' }}>
              Created {selectedGoal.decomposeOutput.questlines?.length || 0} questlines
              {selectedGoal.decomposedAt && (
                <span> • Decomposed at: {new Date(selectedGoal.decomposedAt).toLocaleString()}</span>
              )}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Goals list view
  return (
    <div
      style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
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
              placeholder="Enter goal title (e.g., 'Build a marketing website')"
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
              onClick={createGoal}
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

      {/* Goals List */}
      {goals.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>No goals yet.</p>
          <p>Create your first organizational goal to get started!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {goals.map((goal) => (
            <div
              key={goal.id}
              onClick={() => navigate(`/goals/${goal.id}`)}
              style={{
                padding: '20px',
                background: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #ddd',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f8ff';
                e.currentTarget.style.borderColor = '#0066cc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f9f9f9';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>{goal.title}</h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        background: getStatusColor(goal.status),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {getStatusLabel(goal.status)}
                    </span>
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      Created: {new Date(goal.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '24px' }}>→</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

