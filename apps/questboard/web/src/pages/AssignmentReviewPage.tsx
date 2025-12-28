import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const WG_PHASE_NAMES: Record<string, string> = {
  W: 'Wonder',
  I: 'Invention',
  D: 'Discernment',
  G: 'Galvanizing',
  E: 'Enablement',
  T: 'Tenacity',
};

interface AssignmentReview {
  goalId: string;
  goalTitle: string;
  orgId: string;
  members: Array<{
    memberId: string;
    memberEmail: string;
    memberRole: string;
    capacityMinutes: number;
    allocatedMinutes: number;
    utilizationPercent: number;
    isOverloaded: boolean;
    tasks: Array<{
      taskId: string;
      title: string;
      questlineId?: string;
      questId?: string;
      estimatedMinutes: number;
      phase?: string;
      priority: string;
      assignmentReason?: {
        scoreBreakdown?: {
          geniusMatch: number;
          competencyMatch: number;
          frustrationPenalty: number;
          workloadPenalty: number;
        };
        alternatives?: Array<{ userId: string; score: number }>;
        aiSuggestedOwner?: string;
      };
    }>;
  }>;
  unassignedTasks: Array<{
    taskId: string;
    title: string;
    estimatedMinutes: number;
    phase?: string;
    priority: string;
  }>;
  totalTasks: number;
  assignedTasks: number;
  totalEstimatedMinutes: number;
}

export default function AssignmentReviewPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<AssignmentReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rebalancing, setRebalancing] = useState(false);

  useEffect(() => {
    if (goalId) {
      fetchReview();
    }
  }, [goalId]);

  const fetchReview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/goals/${goalId}/assignment-review`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setReview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignment review');
    } finally {
      setLoading(false);
    }
  };

  const handleRebalance = async () => {
    if (!goalId) return;
    
    try {
      setRebalancing(true);
      const orgId = review?.orgId || 'default-org';
      const response = await fetch(`/api/assignments/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      // Refresh review after rebalancing
      await fetchReview();
    } catch (err) {
      alert(`Failed to rebalance: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRebalancing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading assignment review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', background: '#ffebee', borderRadius: '8px' }}>
        <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>Error:</p>
        <p style={{ color: '#d32f2f' }}>{error}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  if (!review) {
    return null;
  }

  const overloadedCount = review.members.filter(m => m.isOverloaded).length;
  const totalCapacity = review.members.reduce((sum, m) => sum + m.capacityMinutes, 0);
  const totalAllocated = review.members.reduce((sum, m) => sum + m.allocatedMinutes, 0);

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
          <h2 style={{ fontSize: '32px', margin: 0 }}>📋 Assignment Review</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>{review.goalTitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleRebalance}
            disabled={rebalancing}
            style={{
              padding: '8px 16px',
              background: rebalancing ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: rebalancing ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {rebalancing ? 'Rebalancing...' : '🔄 Rebalance'}
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '30px',
        padding: '20px',
        background: '#f5f5f5',
        borderRadius: '8px',
      }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{review.totalTasks}</div>
          <div style={{ color: '#666', fontSize: '14px' }}>Total Tasks</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{review.assignedTasks}</div>
          <div style={{ color: '#666', fontSize: '14px' }}>Assigned</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {Math.round(totalAllocated / 60)}h {totalAllocated % 60}m
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Total Estimated</div>
        </div>
        <div>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: overloadedCount > 0 ? '#d32f2f' : '#28a745',
          }}>
            {overloadedCount}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Overloaded Members</div>
        </div>
      </div>

      {/* Members */}
      {review.members.map((member) => (
        <div
          key={member.memberId}
          style={{
            marginBottom: '24px',
            padding: '20px',
            background: member.isOverloaded ? '#fff3cd' : '#f9f9f9',
            borderRadius: '8px',
            border: `2px solid ${member.isOverloaded ? '#ffc107' : '#ddd'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '20px', margin: 0 }}>{member.memberEmail}</h3>
              <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
                {member.memberRole} • {member.tasks.length} tasks
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold',
                color: member.isOverloaded ? '#d32f2f' : member.utilizationPercent > 80 ? '#ff9800' : '#28a745',
              }}>
                {member.utilizationPercent}%
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {Math.round(member.allocatedMinutes / 60)}h {member.allocatedMinutes % 60}m / {Math.round(member.capacityMinutes / 60)}h
              </div>
            </div>
          </div>

          {member.isOverloaded && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: '#ffebee',
              borderRadius: '4px',
              border: '1px solid #f44336',
            }}>
              <strong style={{ color: '#d32f2f' }}>⚠ Overloaded:</strong>
              <span style={{ color: '#d32f2f', marginLeft: '8px' }}>
                {Math.round((member.allocatedMinutes - member.capacityMinutes) / 60)}h over capacity
              </span>
            </div>
          )}

          {/* Tasks */}
          <div>
            {member.tasks.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>No tasks assigned</p>
            ) : (
              member.tasks.map((task) => (
                <div
                  key={task.taskId}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: 'white',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <strong>{task.title}</strong>
                        {task.phase && (
                          <span style={{
                            padding: '2px 8px',
                            background: '#e3f2fd',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}>
                            {task.phase} ({WG_PHASE_NAMES[task.phase]})
                          </span>
                        )}
                        <span style={{
                          padding: '2px 8px',
                          background: task.priority === 'high' || task.priority === 'urgent' ? '#ffebee' : '#f5f5f5',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}>
                          {task.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {Math.round(task.estimatedMinutes / 60)}h {task.estimatedMinutes % 60}m
                      </div>
                      {task.assignmentReason && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                          <strong>Why assigned:</strong>
                          {task.assignmentReason.scoreBreakdown && (
                            <div style={{ marginLeft: '8px', marginTop: '4px' }}>
                              Genius: +{task.assignmentReason.scoreBreakdown.geniusMatch} • 
                              Competency: +{task.assignmentReason.scoreBreakdown.competencyMatch} • 
                              Frustration: {task.assignmentReason.scoreBreakdown.frustrationPenalty} • 
                              Workload: {task.assignmentReason.scoreBreakdown.workloadPenalty}
                            </div>
                          )}
                          {task.assignmentReason.aiSuggestedOwner && (
                            <div style={{ marginLeft: '8px', marginTop: '4px', fontStyle: 'italic' }}>
                              AI suggested: {task.assignmentReason.aiSuggestedOwner}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}

      {/* Unassigned Tasks */}
      {review.unassignedTasks.length > 0 && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffc107',
        }}>
          <h3 style={{ fontSize: '20px', marginTop: 0, marginBottom: '16px' }}>
            ⚠ Unassigned Tasks ({review.unassignedTasks.length})
          </h3>
          {review.unassignedTasks.map((task) => (
            <div
              key={task.taskId}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: 'white',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <strong>{task.title}</strong>
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                {Math.round(task.estimatedMinutes / 60)}h {task.estimatedMinutes % 60}m
              </span>
              {task.phase && (
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 8px',
                  background: '#e3f2fd',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}>
                  {task.phase}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

