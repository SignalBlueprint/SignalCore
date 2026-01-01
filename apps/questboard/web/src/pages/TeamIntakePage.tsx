import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { get, put } from '../lib/api';

const WG_PHASES: string[] = ['W', 'I', 'D', 'G', 'E', 'T'];

interface Member {
  id: string;
  email: string;
  role: string;
}

interface ParsedResults {
  top2?: [string, string];
  competency2?: [string, string];
  frustration2?: [string, string];
  capacity?: number;
  errors?: string[];
}

export default function TeamIntakePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [intakeMode, setIntakeMode] = useState<'manual' | 'paste'>('manual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual form state
  const [top2, setTop2] = useState<[string, string]>(['W', 'I']);
  const [competency2, setCompetency2] = useState<[string, string]>(['D', 'G']);
  const [frustration2, setFrustration2] = useState<[string, string]>(['E', 'T']);
  const [capacity, setCapacity] = useState(240);

  // Paste form state
  const [pasteText, setPasteText] = useState('');
  const [parsedResults, setParsedResults] = useState<ParsedResults | null>(null);
  const [parsingError, setParsingError] = useState<string | null>(null);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (pasteText.trim()) {
      parsePasteText(pasteText);
    } else {
      setParsedResults(null);
      setParsingError(null);
    }
  }, [pasteText]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await get<Member[]>('/api/members');
      setMembers(data);
      if (data.length > 0) {
        // Pre-select member from URL param if provided
        const memberIdFromUrl = searchParams.get('memberId');
        if (memberIdFromUrl && data.find((m: Member) => m.id === memberIdFromUrl)) {
          setSelectedMemberId(memberIdFromUrl);
        } else if (!selectedMemberId) {
          setSelectedMemberId(data[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const parsePasteText = (text: string): void => {
    try {
      setParsingError(null);
      const results: ParsedResults = {};
      const errors: string[] = [];

      // Normalize text: remove extra whitespace, handle various separators
      const normalized = text.replace(/\s+/g, ' ').trim();

      // Parse patterns like "Top: W,I" or "Top: W, I" or "Top W I"
      const topMatch = normalized.match(/top[:\s]+([WIDGET,\s]+)/i);
      const competentMatch = normalized.match(/(?:competent|competency)[:\s]+([WIDGET,\s]+)/i);
      const frustrationMatch = normalized.match(/frustration[:\s]+([WIDGET,\s]+)/i);
      const capacityMatch = normalized.match(/capacity[:\s]+(\d+)/i);

      // Parse top2
      if (topMatch) {
        const phases = topMatch[1]
          .split(/[,|]/)
          .map((p) => p.trim().toUpperCase())
          .filter((p) => WG_PHASES.includes(p));
        
        if (phases.length >= 2) {
          if (phases[0] === phases[1]) {
            errors.push('Top 2 phases cannot be duplicates');
          } else {
            results.top2 = [phases[0] as string, phases[1] as string] as [string, string];
          }
        } else {
          errors.push('Top 2 must have exactly 2 phases (found: ' + phases.length + ')');
        }
      } else {
        errors.push('Could not find "Top" section');
      }

      // Parse competency2
      if (competentMatch) {
        const phases = competentMatch[1]
          .split(/[,|]/)
          .map((p) => p.trim().toUpperCase())
          .filter((p) => WG_PHASES.includes(p));
        
        if (phases.length >= 2) {
          if (phases[0] === phases[1]) {
            errors.push('Competency phases cannot be duplicates');
          } else {
            results.competency2 = [phases[0] as string, phases[1] as string] as [string, string];
          }
        } else {
          errors.push('Competency must have exactly 2 phases');
        }
      }

      // Parse frustration2
      if (frustrationMatch) {
        const phases = frustrationMatch[1]
          .split(/[,|]/)
          .map((p) => p.trim().toUpperCase())
          .filter((p) => WG_PHASES.includes(p));
        
        if (phases.length >= 2) {
          if (phases[0] === phases[1]) {
            errors.push('Frustration phases cannot be duplicates');
          } else {
            results.frustration2 = [phases[0] as string, phases[1] as string] as [string, string];
          }
        } else {
          errors.push('Frustration must have exactly 2 phases');
        }
      }

      // Parse capacity
      if (capacityMatch) {
        const cap = parseInt(capacityMatch[1], 10);
        if (cap >= 30 && cap <= 720) {
          results.capacity = cap;
        } else {
          errors.push(`Capacity ${cap} is out of bounds (must be 30-720 minutes)`);
        }
      }

      if (errors.length > 0) {
        results.errors = errors;
      }

      setParsedResults(results);
    } catch (err) {
      setParsingError(err instanceof Error ? err.message : 'Failed to parse text');
      setParsedResults(null);
    }
  };

  const validateProfile = (profile: {
    top2: [string, string];
    competency2?: [string, string];
    frustration2?: [string, string];
    capacity: number;
  }): string[] => {
    const errors: string[] = [];

    // Validate top2 (required)
    if (!profile.top2 || profile.top2.length !== 2) {
      errors.push('Top 2 is required');
    } else {
      if (profile.top2[0] === profile.top2[1]) {
        errors.push('Top 2 phases cannot be duplicates');
      }
      if (!WG_PHASES.includes(profile.top2[0]) || !WG_PHASES.includes(profile.top2[1])) {
        errors.push('Top 2 must be valid WG phases (W, I, D, G, E, T)');
      }
    }

    // Validate competency2 (optional but if provided, must be valid)
    if (profile.competency2) {
      if (profile.competency2.length !== 2) {
        errors.push('Competency must have exactly 2 phases');
      } else {
        if (profile.competency2[0] === profile.competency2[1]) {
          errors.push('Competency phases cannot be duplicates');
        }
        if (!WG_PHASES.includes(profile.competency2[0]) || !WG_PHASES.includes(profile.competency2[1])) {
          errors.push('Competency must be valid WG phases');
        }
      }
    }

    // Validate frustration2 (optional but if provided, must be valid)
    if (profile.frustration2) {
      if (profile.frustration2.length !== 2) {
        errors.push('Frustration must have exactly 2 phases');
      } else {
        if (profile.frustration2[0] === profile.frustration2[1]) {
          errors.push('Frustration phases cannot be duplicates');
        }
        if (!WG_PHASES.includes(profile.frustration2[0]) || !WG_PHASES.includes(profile.frustration2[1])) {
          errors.push('Frustration must be valid WG phases');
        }
      }
    }

    // Validate capacity
    if (profile.capacity < 30 || profile.capacity > 720) {
      errors.push('Capacity must be between 30 and 720 minutes');
    }

    return errors;
  };

  const saveProfile = async (profile: {
    top2: [string, string];
    competency2?: [string, string];
    frustration2?: [string, string];
    capacity: number;
  }) => {
    if (!selectedMemberId) {
      setSaveError('Please select a member');
      return;
    }

    const errors = validateProfile(profile);
    if (errors.length > 0) {
      setSaveError(errors.join(', '));
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const member = members.find((m) => m.id === selectedMemberId);
      if (!member) {
        setSaveError('Member not found');
        return;
      }

      // For incomplete profiles, only send top2 and capacity
      const payload: any = {
        top2: profile.top2,
        dailyCapacityMinutes: profile.capacity,
      };

      // Only include competency2 and frustration2 if both values are provided and not empty
      if (profile.competency2 && profile.competency2[0] && profile.competency2[1]) {
        payload.competency2 = profile.competency2;
      }
      if (profile.frustration2 && profile.frustration2[0] && profile.frustration2[1]) {
        payload.frustration2 = profile.frustration2;
      }

      await put(`/api/team/profiles/${selectedMemberId}`, payload);

      // Success - navigate back to team page
      navigate('/team');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (intakeMode === 'manual') {
      saveProfile({
        top2,
        competency2,
        frustration2,
        capacity,
      });
    } else {
      // Use parsed results
      if (parsedResults && parsedResults.top2 && parsedResults.capacity) {
        saveProfile({
          top2: parsedResults.top2,
          competency2: parsedResults.competency2,
          frustration2: parsedResults.frustration2,
          capacity: parsedResults.capacity,
        });
      } else {
        setSaveError('Please provide valid Top 2 and Capacity at minimum');
      }
    }
  };

  const applyQuickFill = () => {
    // Default profile: capacity 240, only top2 required
    setCapacity(240);
    setTop2(['W', 'I']);
    // Leave competency and frustration empty for incomplete profile
    setCompetency2(['', ''] as any);
    setFrustration2(['', ''] as any);
  };

  const updateArray = (
    arr: [string, string],
    index: number,
    value: string,
    setter: (v: [string, string]) => void
  ) => {
    const newArr: [string, string] = [arr[0], arr[1]];
    newArr[index] = value;
    setter(newArr);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading members...</p>
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

  if (members.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No members found. Please add members to your organization first.</p>
        <button
          onClick={() => navigate('/team')}
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
          Go to Team Page
        </button>
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
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h2 style={{ fontSize: '32px', marginBottom: '10px' }}>⚡ Quick Assessment Intake</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Quickly add Working Genius profiles for team members
      </p>

      {/* Member Selector */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Select Member
        </label>
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '16px',
          }}
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.email} ({member.role})
            </option>
          ))}
        </select>
      </div>

      {/* Intake Mode Selector */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Intake Method
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setIntakeMode('manual')}
            style={{
              flex: 1,
              padding: '12px',
              background: intakeMode === 'manual' ? '#0066cc' : '#f0f0f0',
              color: intakeMode === 'manual' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: intakeMode === 'manual' ? 'bold' : 'normal',
            }}
          >
            Option A: Manual Select
          </button>
          <button
            onClick={() => setIntakeMode('paste')}
            style={{
              flex: 1,
              padding: '12px',
              background: intakeMode === 'paste' ? '#0066cc' : '#f0f0f0',
              color: intakeMode === 'paste' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: intakeMode === 'paste' ? 'bold' : 'normal',
            }}
          >
            Option B: Paste Results
          </button>
        </div>
      </div>

      {/* Quick Fill Button */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={applyQuickFill}
          style={{
            padding: '8px 16px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Quick Fill: Default Profile (240min, Top2 only)
        </button>
      </div>

      {/* Manual Form */}
      {intakeMode === 'manual' && (
        <ManualForm
          top2={top2}
          setTop2={setTop2}
          competency2={competency2}
          setCompetency2={setCompetency2}
          frustration2={frustration2}
          setFrustration2={setFrustration2}
          capacity={capacity}
          setCapacity={setCapacity}
          updateArray={updateArray}
        />
      )}

      {/* Paste Form */}
      {intakeMode === 'paste' && (
        <PasteForm
          pasteText={pasteText}
          setPasteText={setPasteText}
          parsedResults={parsedResults}
          parsingError={parsingError}
        />
      )}

      {/* Save Error */}
      {saveError && (
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            background: '#ffebee',
            borderRadius: '4px',
            color: '#d32f2f',
          }}
        >
          <strong>Error:</strong> {saveError}
        </div>
      )}

      {/* Save Button */}
      <div style={{ marginTop: '30px', display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: '12px 24px',
            background: saving ? '#ccc' : '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
        <button
          onClick={() => navigate('/team')}
          style={{
            padding: '12px 24px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ManualForm({
  top2,
  setTop2,
  competency2,
  setCompetency2,
  frustration2,
  setFrustration2,
  capacity,
  setCapacity,
  updateArray,
}: {
  top2: [string, string];
  setTop2: (v: [string, string]) => void;
  competency2: [string, string];
  setCompetency2: (v: [string, string]) => void;
  frustration2: [string, string];
  setFrustration2: (v: [string, string]) => void;
  capacity: number;
  setCapacity: (v: number) => void;
  updateArray: (
    arr: [string, string],
    index: number,
    value: string,
    setter: (v: [string, string]) => void
  ) => void;
}) {
  const WG_PHASE_NAMES: Record<string, string> = {
    W: 'Wonder',
    I: 'Invention',
    D: 'Discernment',
    G: 'Galvanizing',
    E: 'Enablement',
    T: 'Tenacity',
  };
  const WG_PHASES: string[] = ['W', 'I', 'D', 'G', 'E', 'T'];

  return (
    <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Top 2 (Required) *
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={top2[0]}
            onChange={(e) => updateArray(top2, 0, e.target.value, setTop2)}
            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
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
            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            {WG_PHASES.filter((p) => p !== top2[0]).map((p) => (
              <option key={p} value={p}>
                {p} - {WG_PHASE_NAMES[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Competency 2 (Optional)
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={competency2[0]}
            onChange={(e) => updateArray(competency2, 0, e.target.value, setCompetency2)}
            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">--</option>
            {WG_PHASES.filter((p) => p !== competency2[1]).map((p) => (
              <option key={p} value={p}>
                {p} - {WG_PHASE_NAMES[p]}
              </option>
            ))}
          </select>
          <select
            value={competency2[1]}
            onChange={(e) => updateArray(competency2, 1, e.target.value, setCompetency2)}
            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">--</option>
            {WG_PHASES.filter((p) => p !== competency2[0]).map((p) => (
              <option key={p} value={p}>
                {p} - {WG_PHASE_NAMES[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Frustration 2 (Optional)
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={frustration2[0]}
            onChange={(e) => updateArray(frustration2, 0, e.target.value, setFrustration2)}
            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">--</option>
            {WG_PHASES.filter((p) => p !== frustration2[1]).map((p) => (
              <option key={p} value={p}>
                {p} - {WG_PHASE_NAMES[p]}
              </option>
            ))}
          </select>
          <select
            value={frustration2[1]}
            onChange={(e) => updateArray(frustration2, 1, e.target.value, setFrustration2)}
            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">--</option>
            {WG_PHASES.filter((p) => p !== frustration2[0]).map((p) => (
              <option key={p} value={p}>
                {p} - {WG_PHASE_NAMES[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Daily Capacity (minutes) *
        </label>
        <input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(parseInt(e.target.value) || 240)}
          min="30"
          max="720"
          style={{ width: '200px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <span style={{ marginLeft: '8px', color: '#666' }}>
          ({Math.round(capacity / 60)} hours) - Must be 30-720 minutes
        </span>
      </div>
    </div>
  );
}

function PasteForm({
  pasteText,
  setPasteText,
  parsedResults,
  parsingError,
}: {
  pasteText: string;
  setPasteText: (v: string) => void;
  parsedResults: ParsedResults | null;
  parsingError: string | null;
}) {
  const WG_PHASE_NAMES: Record<string, string> = {
    W: 'Wonder',
    I: 'Invention',
    D: 'Discernment',
    G: 'Galvanizing',
    E: 'Enablement',
    T: 'Tenacity',
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Paste Assessment Results
        </label>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder='Example: Top: W,I | Competent: D,G | Frustration: E,T | Capacity: 240'
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '14px',
          }}
        />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          Format: <code>Top: W,I | Competent: D,G | Frustration: E,T | Capacity: 240</code>
        </p>
      </div>

      {parsingError && (
        <div
          style={{
            padding: '12px',
            background: '#ffebee',
            borderRadius: '4px',
            color: '#d32f2f',
            marginBottom: '16px',
          }}
        >
          <strong>Parse Error:</strong> {parsingError}
        </div>
      )}

      {parsedResults && (
        <div
          style={{
            padding: '16px',
            background: parsedResults.errors && parsedResults.errors.length > 0 ? '#fff3cd' : '#d4edda',
            borderRadius: '4px',
            border: '1px solid',
            borderColor: parsedResults.errors && parsedResults.errors.length > 0 ? '#ffc107' : '#28a745',
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Preview:</h4>
          
          {parsedResults.errors && parsedResults.errors.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#856404' }}>Issues found:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#856404' }}>
                {parsedResults.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedResults.top2 && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Top 2:</strong>{' '}
              {parsedResults.top2.map((p, i) => (
                <span key={i} style={{ marginLeft: '8px' }}>
                  {p} ({WG_PHASE_NAMES[p]})
                </span>
              ))}
            </div>
          )}

          {parsedResults.competency2 && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Competency:</strong>{' '}
              {parsedResults.competency2.map((p, i) => (
                <span key={i} style={{ marginLeft: '8px' }}>
                  {p} ({WG_PHASE_NAMES[p]})
                </span>
              ))}
            </div>
          )}

          {parsedResults.frustration2 && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Frustration:</strong>{' '}
              {parsedResults.frustration2.map((p, i) => (
                <span key={i} style={{ marginLeft: '8px' }}>
                  {p} ({WG_PHASE_NAMES[p]})
                </span>
              ))}
            </div>
          )}

          {parsedResults.capacity && (
            <div>
              <strong>Capacity:</strong> {parsedResults.capacity} minutes ({Math.round(parsedResults.capacity / 60)} hours)
            </div>
          )}

          {!parsedResults.top2 || !parsedResults.capacity ? (
            <div style={{ marginTop: '12px', color: '#856404' }}>
              <strong>Note:</strong> Top 2 and Capacity are required to save.
            </div>
          ) : !parsedResults.errors || parsedResults.errors.length === 0 ? (
            <div style={{ marginTop: '12px', color: '#155724' }}>
              ✓ Ready to save
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

