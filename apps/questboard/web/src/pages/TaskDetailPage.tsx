import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { get, post, put } from '../lib/api';

interface TaskOutput {
  id: string;
  type: 'text' | 'link' | 'file' | 'code' | 'image';
  content: string;
  title?: string;
  submittedAt: string;
  submittedBy?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  phase?: string;
  estimatedMinutes?: number;
  acceptanceCriteria?: string[];
  dod?: string;
  blockers?: string[];
  owner?: string;
  questId?: string;
  expandState?: 'ready' | 'expanded' | 'locked';
  notes?: string;
  outputs?: TaskOutput[];
  subtasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

interface Quest {
  id: string;
  title: string;
  objective: string;
  questlineId: string;
}

interface GoalPath {
  id: string;
  title: string;
}

interface AIHelpResponse {
  type: string;
  content: string;
  subtasks?: Array<{ title: string; description?: string }>;
  hints?: string[];
  nextActions?: string[];
  blockers?: string[];
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [goalPath, setGoalPath] = useState<GoalPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiHelp, setAiHelp] = useState<AIHelpResponse | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showOutputForm, setShowOutputForm] = useState(false);
  const [outputType, setOutputType] = useState<'text' | 'link' | 'file' | 'code' | 'image'>('text');
  const [outputContent, setOutputContent] = useState('');
  const [outputTitle, setOutputTitle] = useState('');
  const [submittingOutput, setSubmittingOutput] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      setError(null);

      const taskData = await get<Task>(`/api/tasks/${taskId}`);
      setTask(taskData);
      setNotes(taskData.notes || '');

      // Fetch quest if available
      if (taskData.questId) {
        try {
          const questData = await get<Quest>(`/api/quests/${taskData.questId}`);
          setQuest(questData);

          // Fetch goal path
          if (questData.goalId) {
            try {
              const path = await get<GoalPath[]>(`/api/goals/${questData.goalId}/path`);
              setGoalPath(path || []);
            } catch (err) {
              // Goal path is optional
              setGoalPath([]);
            }
          }
        } catch (err) {
          // Quest is optional
          setQuest(null);
        }
      }
    } catch (err) {
      console.error('Fetch task error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch task');
    } finally {
      setLoading(false);
    }
  };

  const submitOutput = async () => {
    if (!task || !outputContent.trim()) return;

    try {
      setSubmittingOutput(true);
      await post(`/api/tasks/${task.id}/outputs`, {
        type: outputType,
        content: outputContent.trim(),
        title: outputTitle.trim() || undefined,
      });

      // Refresh task to get updated outputs
      await fetchTask();

      // Reset form
      setOutputContent('');
      setOutputTitle('');
      setShowOutputForm(false);

      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/today');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit output');
    } finally {
      setSubmittingOutput(false);
    }
  };

  const updateTaskStatus = async (newStatus: Task['status']) => {
    if (!task) return;

    // If completing and no outputs exist, show output form instead
    if (newStatus === 'done' && (!task.outputs || task.outputs.length === 0)) {
      setShowOutputForm(true);
      return;
    }

    try {
      setUpdating(true);
      const updated = await put<Task>(`/api/tasks/${task.id}`, { updates: { status: newStatus } });
      setTask(updated);

      // If completing, check if we should navigate back
      if (newStatus === 'done') {
        setTimeout(() => {
          navigate('/today');
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    if (!task) return;

    try {
      setUpdating(true);
      const updated = await put<Task>(`/api/tasks/${task.id}`, { updates: { notes } });
      setTask(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  const getAIHelp = async (helpType: 'hints' | 'breakdown' | 'next-actions' | 'blockers') => {
    if (!task) return;

    try {
      setAiLoading(helpType);
      setError(null);

      const help = await post<AIHelpResponse>(`/api/tasks/${task.id}/ai-help`, { type: helpType });
      setAiHelp(help);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI help');
    } finally {
      setAiLoading(null);
    }
  };

  const expandTask = async () => {
    if (!task) return;

    try {
      setAiLoading('expand');
      setError(null);

      const result = await post<any>(`/api/tasks/${task.id}/expand`);

      // Refresh task data
      await fetchTask();

      // Show success message
      alert(`Task expanded! Created ${result.subtasksCreated || 0} subtasks.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to expand task');
    } finally {
      setAiLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return '#4CAF50';
      case 'in-progress': return '#2196F3';
      case 'blocked': return '#f44336';
      default: return '#9E9E9E';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case 'W': return '💭 Wonder';
      case 'I': return '💡 Invention';
      case 'D': return '🔍 Discernment';
      case 'G': return '📣 Galvanizing';
      case 'E': return '🛠️ Enablement';
      case 'T': return '🎯 Tenacity';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading task...</p>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{ background: '#ffebee', padding: '20px', borderRadius: '8px', color: '#d32f2f' }}>
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/today')}>Back to Today</button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Task not found</p>
        <Link to={`/today`}>Back to Today</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to={`/today`} style={{ color: '#667eea', textDecoration: 'none', marginBottom: '8px', display: 'inline-block' }}>
            ← Back to Today
          </Link>
          <h1 style={{ margin: '8px 0', fontSize: '32px' }}>{task.title}</h1>
          {goalPath.length > 0 && (
            <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              {goalPath.map((g, i) => (
                <span key={g.id}>
                  {i > 0 && ' → '}
                  <Link to={`/goals/${g.id}`} style={{ color: '#0066cc', textDecoration: 'underline' }}>
                    {g.title}
                  </Link>
                </span>
              ))}
              {quest && ` → ${quest.title}`}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {task.status !== 'done' && (
            <button
              onClick={() => updateTaskStatus(task.status === 'in-progress' ? 'todo' : 'in-progress')}
              disabled={updating}
              style={{
                padding: '10px 20px',
                background: task.status === 'in-progress' ? '#9E9E9E' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: updating ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {task.status === 'in-progress' ? 'Mark as Todo' : 'Start Working'}
            </button>
          )}
          {task.status !== 'done' && (
            <button
              onClick={() => updateTaskStatus('done')}
              disabled={updating}
              style={{
                padding: '10px 20px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: updating ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              ✓ Complete
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#ffebee', padding: '16px', borderRadius: '8px', color: '#d32f2f', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Task Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Status</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: getStatusColor(task.status) }}>
            {task.status === 'in-progress' ? '⚙️ In Progress' : task.status === 'done' ? '✅ Done' : task.status === 'blocked' ? '🚫 Blocked' : '⬜ Todo'}
          </div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Priority</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: getPriorityColor(task.priority) }}>
            {task.priority.toUpperCase()}
          </div>
        </div>
        {task.estimatedMinutes && (
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Estimated Time</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {Math.floor(task.estimatedMinutes / 60)}h {task.estimatedMinutes % 60}m
            </div>
          </div>
        )}
        {task.phase && (
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Phase</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{getPhaseIcon(task.phase)}</div>
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Description</h3>
          <p style={{ color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{task.description}</p>
        </div>
      )}

      {/* Acceptance Criteria / Definition of Done */}
      {(task.acceptanceCriteria?.length || task.dod) && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Definition of Done</h3>
          {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {task.acceptanceCriteria.map((criteria, idx) => (
                <li key={idx} style={{ marginBottom: '8px', color: '#333' }}>{criteria}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#333', whiteSpace: 'pre-wrap' }}>{task.dod}</p>
          )}
        </div>
      )}

      {/* Blockers */}
      {task.blockers && task.blockers.length > 0 && (
        <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffc107' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#856404' }}>🚫 Blockers</h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {task.blockers.map((blocker, idx) => (
              <li key={idx} style={{ marginBottom: '8px', color: '#856404' }}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Subtasks */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>📋 Subtasks ({task.subtasks.length})</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {task.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                style={{
                  padding: '16px',
                  background: '#f9f9f9',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/tasks/${subtask.id}`}
                      style={{
                        color: '#2196F3',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        fontSize: '16px',
                      }}
                    >
                      {subtask.title}
                    </Link>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: getStatusColor(subtask.status),
                        color: 'white',
                      }}
                    >
                      {subtask.status === 'done' ? '✓ Done' : subtask.status === 'in-progress' ? '⚙️ In Progress' : subtask.status === 'blocked' ? '🚫 Blocked' : '⬜ Todo'}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: getPriorityColor(subtask.priority),
                        color: 'white',
                      }}
                    >
                      {subtask.priority.toUpperCase()}
                    </span>
                  </div>
                  {subtask.description && (
                    <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                      {subtask.description}
                    </p>
                  )}
                </div>
                <Link
                  to={`/tasks/${subtask.id}`}
                  style={{
                    padding: '8px 16px',
                    background: '#2196F3',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginLeft: '16px',
                  }}
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Help Section */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>🤖 AI Assistance</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={() => getAIHelp('hints')}
            disabled={aiLoading !== null}
            style={{
              padding: '12px 16px',
              background: aiLoading === 'hints' ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: aiLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {aiLoading === 'hints' ? '⏳ Loading...' : '💡 Get Hints'}
          </button>
          <button
            onClick={() => getAIHelp('breakdown')}
            disabled={aiLoading !== null}
            style={{
              padding: '12px 16px',
              background: aiLoading === 'breakdown' ? '#ccc' : '#9c27b0',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: aiLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {aiLoading === 'breakdown' ? '⏳ Loading...' : '📋 Break Down'}
          </button>
          <button
            onClick={() => getAIHelp('next-actions')}
            disabled={aiLoading !== null}
            style={{
              padding: '12px 16px',
              background: aiLoading === 'next-actions' ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: aiLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {aiLoading === 'next-actions' ? '⏳ Loading...' : '➡️ Next Actions'}
          </button>
          <button
            onClick={expandTask}
            disabled={aiLoading !== null || (task.expandState === 'expanded')}
            style={{
              padding: '12px 16px',
              background: aiLoading === 'expand' ? '#ccc' : (task.expandState === 'expanded') ? '#9E9E9E' : '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (aiLoading || task.expandState === 'expanded') ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {aiLoading === 'expand' ? '⏳ Expanding...' : (task.expandState === 'expanded') ? '✓ Expanded' : '🔀 Expand Task'}
          </button>
        </div>

        {aiHelp && (
          <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '6px', marginTop: '16px' }}>
            {aiHelp.hints && (
              <div>
                <h4 style={{ marginTop: 0 }}>💡 Hints</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {aiHelp.hints.map((hint, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>{hint}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiHelp.nextActions && (
              <div>
                <h4 style={{ marginTop: 0 }}>➡️ Next Actions</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {aiHelp.nextActions.map((action, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiHelp.subtasks && (
              <div>
                <h4 style={{ marginTop: 0 }}>📋 Breakdown</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {aiHelp.subtasks.map((subtask, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>
                      <strong>{subtask.title}</strong>
                      {subtask.description && <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{subtask.description}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiHelp.content && (
              <div style={{ whiteSpace: 'pre-wrap' }}>{aiHelp.content}</div>
            )}
          </div>
        )}
      </div>

      {/* Output Submission Form */}
      {showOutputForm && (
        <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #2196F3' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>📤 Submit Task Output</h3>
          <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
            What did you deliver? Share a link, file, code snippet, description, or image. This will be saved with the task.
          </p>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>Output Type</label>
            <select
              value={outputType}
              onChange={(e) => setOutputType(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="text">Text Description</option>
              <option value="link">Link/URL</option>
              <option value="code">Code Snippet</option>
              <option value="file">File Path/Reference</option>
              <option value="image">Image URL</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>Title (optional)</label>
            <input
              type="text"
              value={outputTitle}
              onChange={(e) => setOutputTitle(e.target.value)}
              placeholder="e.g., 'API Documentation', 'Pull Request #123'"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
              {outputType === 'text' ? 'Description' : outputType === 'link' ? 'URL' : outputType === 'code' ? 'Code' : outputType === 'file' ? 'File Path' : 'Image URL'}
            </label>
            {outputType === 'code' ? (
              <textarea
                value={outputContent}
                onChange={(e) => setOutputContent(e.target.value)}
                placeholder="Paste your code here..."
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            ) : (
              <textarea
                value={outputContent}
                onChange={(e) => setOutputContent(e.target.value)}
                placeholder={
                  outputType === 'text' ? 'Describe what you delivered...' :
                  outputType === 'link' ? 'https://...' :
                  outputType === 'file' ? '/path/to/file or file://...' :
                  'https://...'
                }
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowOutputForm(false);
                setOutputContent('');
                setOutputTitle('');
              }}
              disabled={submittingOutput}
              style={{
                padding: '10px 20px',
                background: '#9E9E9E',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: submittingOutput ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              Cancel
            </button>
            <button
              onClick={submitOutput}
              disabled={submittingOutput || !outputContent.trim()}
              style={{
                padding: '10px 20px',
                background: submittingOutput || !outputContent.trim() ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (submittingOutput || !outputContent.trim()) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {submittingOutput ? 'Submitting...' : '✓ Submit & Complete Task'}
            </button>
          </div>
        </div>
      )}

      {/* Submitted Outputs */}
      {task.outputs && task.outputs.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>📦 Task Outputs ({task.outputs.length})</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {task.outputs.map((output) => (
              <div
                key={output.id}
                style={{
                  padding: '16px',
                  background: '#f9f9f9',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    {output.title && (
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold' }}>{output.title}</h4>
                    )}
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {output.type === 'text' && '📝 Text'}
                      {output.type === 'link' && '🔗 Link'}
                      {output.type === 'code' && '💻 Code'}
                      {output.type === 'file' && '📁 File'}
                      {output.type === 'image' && '🖼️ Image'}
                      {' • '}
                      {new Date(output.submittedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '8px' }}>
                  {output.type === 'link' ? (
                    <a
                      href={output.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2196F3', textDecoration: 'underline', wordBreak: 'break-all' }}
                    >
                      {output.content}
                    </a>
                  ) : output.type === 'code' ? (
                    <pre style={{
                      background: '#f5f5f5',
                      padding: '12px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '13px',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {output.content}
                    </pre>
                  ) : output.type === 'image' ? (
                    <div>
                      <img
                        src={output.content}
                        alt={output.title || 'Task output'}
                        style={{ maxWidth: '100%', borderRadius: '4px', marginTop: '8px' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <a
                        href={output.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2196F3', textDecoration: 'underline', display: 'block', marginTop: '8px' }}
                      >
                        {output.content}
                      </a>
                    </div>
                  ) : (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{output.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
        <h3 style={{ marginTop: 0, marginBottom: '12px' }}>📝 Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Add your notes, thoughts, or progress updates here..."
          style={{
            width: '100%',
            minHeight: '150px',
            padding: '12px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            fontFamily: 'inherit',
            fontSize: '14px',
            resize: 'vertical',
          }}
        />
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          Notes are saved automatically when you click away
        </div>
      </div>
    </div>
  );
}

