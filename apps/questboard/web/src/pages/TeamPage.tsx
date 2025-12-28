import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const WG_PHASE_NAMES: Record<string, string> = {
  W: 'Wonder',
  I: 'Invention',
  D: 'Discernment',
  G: 'Galvanizing',
  E: 'Enablement',
  T: 'Tenacity',
};

const WG_PHASES: string[] = ['W', 'I', 'D', 'G', 'E', 'T'];

interface MemberProfile {
  memberId: string;
  orgId: string;
  top2: [string, string];
  competency2: [string, string];
  frustration2: [string, string];
  dailyCapacityMinutes: number;
  timezone?: string;
  role?: string;
  strengths?: string[];
  weaknesses?: string[];
  notes?: string;
  updatedAt: string;
}

interface Member {
  id: string;
  email: string;
  role: string;
}

interface TeamSnapshot {
  orgId: string;
  members: Array<{
    id: string;
    email: string;
    role: string;
    profile: MemberProfile;
  }>;
  teamNotes?: string;
  generatedAt: string;
}

export default function TeamPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [orgId] = useState('default-org');
  const [teamSnapshot, setTeamSnapshot] = useState<TeamSnapshot | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [teamNotes, setTeamNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, [location, orgId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [teamRes, membersRes] = await Promise.all([
        fetch(`/api/team?orgId=${orgId}`),
        fetch(`/api/members?orgId=${orgId}`),
      ]);

      if (!teamRes.ok) throw new Error(`HTTP ${teamRes.status}`);
      if (!membersRes.ok) throw new Error(`HTTP ${membersRes.status}`);

      const teamData = await teamRes.json();
      const membersData = await membersRes.json();

      setTeamSnapshot(teamData);
      setMembers(membersData);
      setTeamNotes(teamData.teamNotes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team data');
    } finally {
      setLoading(false);
    }
  };

  const saveMemberProfile = async (memberId: string, profile: Partial<MemberProfile>) => {
    try {
      const response = await fetch(`/api/team/profiles/${memberId}?orgId=${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, orgId }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await fetchTeamData();
      setEditingProfile(null);
    } catch (err) {
      alert(`Failed to save profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const saveTeamNotes = async () => {
    try {
      setSavingNotes(true);
      const response = await fetch(`/api/team/settings?orgId=${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, teamNotes }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      await fetchTeamData();
    } catch (err) {
      alert(`Failed to save team notes: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingNotes(false);
    }
  };

  const addMember = async () => {
    if (!newMemberEmail.trim()) {
      setAddMemberError('Email is required');
      return;
    }

    try {
      setAddingMember(true);
      setAddMemberError(null);

      const response = await fetch(`/api/members?orgId=${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole,
          orgId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Success - reset form and refresh data
      setNewMemberEmail('');
      setNewMemberRole('member');
      setShowAddMember(false);
      await fetchTeamData();
    } catch (err) {
      setAddMemberError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const getTeamCompleteness = () => {
    if (!teamSnapshot || members.length === 0) return { complete: false, count: 0, total: 0 };
    
    const complete = teamSnapshot.members.filter(m => 
      m.profile && m.profile.dailyCapacityMinutes > 0
    );
    
    return {
      complete: complete.length === members.length && members.length > 0,
      count: complete.length,
      total: members.length,
    };
  };

  const completeness = getTeamCompleteness();

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading team data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', background: '#ffebee', borderRadius: '8px' }}>
        <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>Error:</p>
        <p style={{ color: '#d32f2f' }}>{error}</p>
      </div>
    );
  }

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
        <h2 style={{ fontSize: '32px', margin: 0 }}>👥 TEAM</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/team/intake')}
            style={{
              padding: '8px 16px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            ⚡ Quick Intake
          </button>
          <div
            style={{
              padding: '8px 16px',
              borderRadius: '16px',
              background: completeness.complete ? '#d4edda' : '#fff3cd',
              color: completeness.complete ? '#155724' : '#856404',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {completeness.complete ? '✓ Team Complete' : `Team: ${completeness.count}/${completeness.total} profiles`}
          </div>
        </div>
      </div>

      {/* Team Notes */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Team Notes</h3>
        <textarea
          value={teamNotes}
          onChange={(e) => setTeamNotes(e.target.value)}
          onBlur={saveTeamNotes}
          placeholder="Add team notes, preferences, or context..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: '14px',
          }}
        />
        {savingNotes && <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>Saving...</p>}
      </div>

      {/* Add Member Section */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #0066cc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAddMember ? '16px' : '0' }}>
          <h3 style={{ fontSize: '20px', margin: 0 }}>Members</h3>
          {!showAddMember && (
            <button
              onClick={() => setShowAddMember(true)}
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              + Add Member
            </button>
          )}
        </div>

        {showAddMember && (
          <div style={{ padding: '16px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
            <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Add New Member</h4>
            
            {addMemberError && (
              <div style={{ marginBottom: '12px', padding: '8px 12px', background: '#ffebee', borderRadius: '4px', color: '#d32f2f' }}>
                <strong>Error:</strong> {addMemberError}
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Email *</label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="member@example.com"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addMember();
                    } else if (e.key === 'Escape') {
                      setShowAddMember(false);
                      setAddMemberError(null);
                    }
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={addMember}
                disabled={addingMember || !newMemberEmail.trim()}
                style={{
                  padding: '8px 16px',
                  background: addingMember || !newMemberEmail.trim() ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: addingMember || !newMemberEmail.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {addingMember ? 'Adding...' : 'Add Member'}
              </button>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setNewMemberEmail('');
                  setNewMemberRole('member');
                  setAddMemberError(null);
                }}
                disabled={addingMember}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: addingMember ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Profiles */}
      <div>
        {members.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No members found. Add members to your organization.</p>
        ) : (
          members.map((member) => {
            const profile = teamSnapshot?.members.find((m) => m.id === member.id)?.profile;
            const isEditing = editingProfile === member.id;

            return (
              <div
                key={member.id}
                style={{
                  padding: '20px',
                  marginBottom: '20px',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '18px', margin: 0 }}>{member.email}</h4>
                    <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
                      {member.role} {profile ? '• Complete' : '• No profile'}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingProfile(isEditing ? null : member.id)}
                    style={{
                      padding: '8px 16px',
                      background: isEditing ? '#6c757d' : '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {isEditing ? 'Cancel' : profile ? 'Edit' : 'Add Profile'}
                  </button>
                </div>

                {isEditing ? (
                  <MemberProfileEditor
                    member={member}
                    profile={profile}
                    onSave={(p) => saveMemberProfile(member.id, p)}
                    onCancel={() => setEditingProfile(null)}
                  />
                ) : profile ? (
                  <MemberProfileView profile={profile} />
                ) : (
                  <div>
                    <p style={{ color: '#999', fontStyle: 'italic', marginBottom: '12px' }}>
                      No profile configured (incomplete)
                    </p>
                    <button
                      onClick={() => navigate(`/team/intake?memberId=${member.id}`)}
                      style={{
                        padding: '6px 12px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      ⚡ Quick Intake
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MemberProfileView({ profile }: { profile: MemberProfile }) {
  const isComplete = profile.competency2 && profile.competency2[0] && profile.competency2[1] &&
                     profile.frustration2 && profile.frustration2[0] && profile.frustration2[1];

  return (
    <div>
      {!isComplete && (
        <div style={{ 
          marginBottom: '12px', 
          padding: '8px 12px', 
          background: '#fff3cd', 
          borderRadius: '4px',
          border: '1px solid #ffc107',
        }}>
          <strong style={{ color: '#856404' }}>⚠ Incomplete Profile:</strong>
          <span style={{ color: '#856404', marginLeft: '8px' }}>
            Missing competency or frustration phases
          </span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div>
          <strong>Top 2:</strong>
          <div style={{ marginTop: '4px' }}>
            {profile.top2.map((p, i) => (
              <span key={i} style={{ marginRight: '8px', padding: '2px 8px', background: '#d4edda', borderRadius: '4px', fontSize: '12px' }}>
                {p} ({WG_PHASE_NAMES[p]})
              </span>
            ))}
          </div>
        </div>
        <div>
          <strong>Competency:</strong>
          <div style={{ marginTop: '4px' }}>
            {profile.competency2 && profile.competency2[0] && profile.competency2[1] ? (
              profile.competency2.map((p, i) => (
                <span key={i} style={{ marginRight: '8px', padding: '2px 8px', background: '#cce5ff', borderRadius: '4px', fontSize: '12px' }}>
                  {p} ({WG_PHASE_NAMES[p]})
                </span>
              ))
            ) : (
              <span style={{ color: '#999', fontStyle: 'italic' }}>Not set</span>
            )}
          </div>
        </div>
        <div>
          <strong>Frustration:</strong>
          <div style={{ marginTop: '4px' }}>
            {profile.frustration2 && profile.frustration2[0] && profile.frustration2[1] ? (
              profile.frustration2.map((p, i) => (
                <span key={i} style={{ marginRight: '8px', padding: '2px 8px', background: '#ffeaa7', borderRadius: '4px', fontSize: '12px' }}>
                  {p} ({WG_PHASE_NAMES[p]})
                </span>
              ))
            ) : (
              <span style={{ color: '#999', fontStyle: 'italic' }}>Not set</span>
            )}
          </div>
        </div>
        <div>
          <strong>Daily Capacity:</strong>
          <div style={{ marginTop: '4px' }}>{Math.round(profile.dailyCapacityMinutes / 60)} hours ({profile.dailyCapacityMinutes} min)</div>
        </div>
      {profile.timezone && (
        <div>
          <strong>Timezone:</strong>
          <div style={{ marginTop: '4px' }}>{profile.timezone}</div>
        </div>
      )}
        {profile.role && (
          <div>
            <strong>Role:</strong>
            <div style={{ marginTop: '4px' }}>{profile.role}</div>
          </div>
        )}
        {profile.notes && (
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>Notes:</strong>
            <div style={{ marginTop: '4px', color: '#666' }}>{profile.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function MemberProfileEditor({
  member,
  profile,
  onSave,
  onCancel,
}: {
  member: Member;
  profile?: MemberProfile;
  onSave: (profile: Partial<MemberProfile>) => void;
  onCancel: () => void;
}) {
  const [top2, setTop2] = useState<[string, string]>(profile?.top2 || ['W', 'I']);
  const [competency2, setCompetency2] = useState<[string, string]>(profile?.competency2 || ['D', 'G']);
  const [frustration2, setFrustration2] = useState<[string, string]>(profile?.frustration2 || ['E', 'T']);
  const [dailyCapacityMinutes, setDailyCapacityMinutes] = useState(profile?.dailyCapacityMinutes || 480);
  const [timezone, setTimezone] = useState(profile?.timezone || '');
  const [role, setRole] = useState(profile?.role || member.role || '');
  const [notes, setNotes] = useState(profile?.notes || '');

  const handleSave = () => {
    onSave({
      top2,
      competency2,
      frustration2,
      dailyCapacityMinutes,
      timezone: timezone || undefined,
      role: role || undefined,
      notes: notes || undefined,
    });
  };

  const updateArray = (arr: [string, string], index: number, value: string, setter: (v: [string, string]) => void) => {
    const newArr: [string, string] = [arr[0], arr[1]];
    newArr[index] = value;
    setter(newArr);
  };

  return (
    <div style={{ padding: '16px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
      <div style={{ display: 'grid', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Top 2 WG Phases</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={top2[0]}
              onChange={(e) => updateArray(top2, 0, e.target.value, setTop2)}
              style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              {WG_PHASES.filter((p) => p !== top2[1]).map((p) => (
                <option key={p} value={p}>
                  {p} - {WG_PHASE_NAMES[p]}
                </option>
              ))}
            </select>
            <select
              value={top2[1]}
              onChange={(e) => updateArray(top2, 1, e.target.value, setTop2)}
              style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              {WG_PHASES.filter((p) => p !== top2[0]).map((p) => (
                <option key={p} value={p}>
                  {p} - {WG_PHASE_NAMES[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Competency 2</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={competency2[0]}
              onChange={(e) => updateArray(competency2, 0, e.target.value, setCompetency2)}
              style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              {WG_PHASES.filter((p) => p !== competency2[1]).map((p) => (
                <option key={p} value={p}>
                  {p} - {WG_PHASE_NAMES[p]}
                </option>
              ))}
            </select>
            <select
              value={competency2[1]}
              onChange={(e) => updateArray(competency2, 1, e.target.value, setCompetency2)}
              style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              {WG_PHASES.filter((p) => p !== competency2[0]).map((p) => (
                <option key={p} value={p}>
                  {p} - {WG_PHASE_NAMES[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Frustration 2</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={frustration2[0]}
              onChange={(e) => updateArray(frustration2, 0, e.target.value, setFrustration2)}
              style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              {WG_PHASES.filter((p) => p !== frustration2[1]).map((p) => (
                <option key={p} value={p}>
                  {p} - {WG_PHASE_NAMES[p]}
                </option>
              ))}
            </select>
            <select
              value={frustration2[1]}
              onChange={(e) => updateArray(frustration2, 1, e.target.value, setFrustration2)}
              style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              {WG_PHASES.filter((p) => p !== frustration2[0]).map((p) => (
                <option key={p} value={p}>
                  {p} - {WG_PHASE_NAMES[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Daily Capacity (minutes)
          </label>
          <input
            type="number"
            value={dailyCapacityMinutes}
            onChange={(e) => setDailyCapacityMinutes(parseInt(e.target.value) || 480)}
            min="0"
            style={{ width: '200px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <span style={{ marginLeft: '8px', color: '#666' }}>
            ({Math.round(dailyCapacityMinutes / 60)} hours)
          </span>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Timezone</label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="e.g., America/New_York"
            style={{ width: '200px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '200px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about this member..."
            style={{ width: '100%', minHeight: '80px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              background: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

