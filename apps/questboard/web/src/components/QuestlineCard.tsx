import { useMemo } from 'react';

interface Quest {
  id: string;
  title: string;
  objective: string;
  state: 'locked' | 'unlocked' | 'in-progress' | 'completed';
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  progress: number;
  unlockedAt?: string;
  completedAt?: string;
}

interface QuestlineCardProps {
  id: string;
  title: string;
  description?: string;
  epic?: string;
  owner?: string;
  assignmentReason?: string;
  quests: Quest[];
  totalTasks: number;
  completedTasks: number;
  progress: number;
  onClick?: () => void;
}

const getStateIcon = (state: Quest['state']) => {
  switch (state) {
    case 'locked':
      return '🔒';
    case 'unlocked':
      return '⚡';
    case 'in-progress':
      return '⚔️';
    case 'completed':
      return '✅';
    default:
      return '❓';
  }
};

const getStateColor = (state: Quest['state']) => {
  switch (state) {
    case 'locked':
      return '#999';
    case 'unlocked':
      return '#FFA500';
    case 'in-progress':
      return '#2196F3';
    case 'completed':
      return '#4CAF50';
    default:
      return '#666';
  }
};

const getStateLabel = (state: Quest['state']) => {
  switch (state) {
    case 'locked':
      return 'Locked';
    case 'unlocked':
      return 'Ready';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Complete';
    default:
      return 'Unknown';
  }
};

export default function QuestlineCard({
  id,
  title,
  description,
  epic,
  owner,
  assignmentReason,
  quests,
  totalTasks,
  completedTasks,
  progress,
  onClick,
}: QuestlineCardProps) {
  const questChain = useMemo(() => {
    // Sort quests by state priority (completed → in-progress → unlocked → locked)
    const statePriority = { completed: 0, 'in-progress': 1, unlocked: 2, locked: 3 };
    return [...quests].sort((a, b) => statePriority[a.state] - statePriority[b.state]);
  }, [quests]);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '24px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'all 0.3s ease',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
          {title}
        </h3>
        {epic && (
          <p style={{ fontSize: '14px', opacity: 0.9, margin: '0 0 8px 0', fontStyle: 'italic' }}>
            📜 {epic}
          </p>
        )}
        {description && (
          <p style={{ fontSize: '14px', opacity: 0.8, margin: 0 }}>
            {description}
          </p>
        )}
      </div>

      {/* Owner Info */}
      {owner && (
        <div
          style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            👤 Quest Leader: {owner}
          </div>
          {assignmentReason && (
            <div style={{ opacity: 0.8, fontSize: '12px' }}>
              {assignmentReason}
            </div>
          )}
        </div>
      )}

      {/* Overall Progress Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
          <span>Overall Progress</span>
          <span style={{ fontWeight: 'bold' }}>
            {completedTasks} / {totalTasks} tasks ({progress}%)
          </span>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '10px',
            height: '20px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
              height: '100%',
              width: `${progress}%`,
              transition: 'width 0.5s ease',
              borderRadius: '10px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '12px',
              fontWeight: 'bold',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {progress}%
          </div>
        </div>
      </div>

      {/* Quest Chain - Linear Progression */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
          🗺️ Quest Chain ({quests.length} quests)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {questChain.map((quest, index) => (
            <div
              key={quest.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                border: `2px solid ${getStateColor(quest.state)}`,
                position: 'relative',
              }}
            >
              {/* Quest Number */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: getStateColor(quest.state),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginRight: '12px',
                  flexShrink: 0,
                }}
              >
                {getStateIcon(quest.state)}
              </div>

              {/* Quest Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                    {quest.title}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: getStateColor(quest.state),
                      fontWeight: 'bold',
                    }}
                  >
                    {getStateLabel(quest.state)}
                  </span>
                </div>

                {/* Quest Progress Mini Bar */}
                {quest.totalTasks > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        height: '6px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          background: '#4CAF50',
                          height: '100%',
                          width: `${quest.progress}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '12px', opacity: 0.9, whiteSpace: 'nowrap' }}>
                      {quest.completedTasks}/{quest.totalTasks}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Lines Between Quests */}
      {questChain.length > 1 && (
        <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '12px', textAlign: 'center' }}>
          Complete quests in order to unlock new challenges
        </div>
      )}
    </div>
  );
}
