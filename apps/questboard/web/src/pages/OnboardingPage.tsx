import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api';

type OnboardingStep = 'welcome' | 'sample-data' | 'complete';

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, org } = useAuth();
  const navigate = useNavigate();

  const handleCreateSampleData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/onboarding/seed-sample-data');
      await apiClient.post('/api/onboarding/complete');
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sample data');
      setIsLoading(false);
    }
  };

  const handleSkipSampleData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/onboarding/skip-sample-data');
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip onboarding');
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    navigate('/today');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {step === 'welcome' && (
          <div>
            <h1 style={{ marginTop: 0, color: '#333', fontSize: '28px' }}>
              Welcome to Questboard! 👋
            </h1>
            <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
              Hi <strong>{user?.email}</strong>! You've successfully created your account
              with <strong>{org?.name}</strong>.
            </p>
            <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
              Questboard helps you organize work into <strong>goals</strong>,
              <strong> questlines</strong>, and <strong>tasks</strong>, with AI-powered
              sprint planning and team assignment based on Working Genius profiles.
            </p>

            <div style={{
              background: '#f8f9fa',
              borderRadius: '8px',
              padding: '20px',
              margin: '24px 0'
            }}>
              <h3 style={{ marginTop: 0, color: '#333', fontSize: '18px' }}>
                Quick Tour
              </h3>
              <ul style={{ color: '#666', lineHeight: '1.8', paddingLeft: '20px' }}>
                <li><strong>Goals:</strong> Strategic objectives for your team</li>
                <li><strong>Questlines:</strong> Connected sequences of related work</li>
                <li><strong>Quests:</strong> Bundles of tasks within a questline</li>
                <li><strong>Tasks:</strong> Individual work items with AI assignment</li>
                <li><strong>Sprint:</strong> AI generates optimal sprint plans for you</li>
                <li><strong>Analytics:</strong> Track velocity, capacity, and completion</li>
              </ul>
            </div>

            <button
              onClick={() => setStep('sample-data')}
              style={{
                width: '100%',
                padding: '14px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#5568d3'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
            >
              Get Started →
            </button>
          </div>
        )}

        {step === 'sample-data' && (
          <div>
            <h2 style={{ marginTop: 0, color: '#333', fontSize: '24px' }}>
              Try it with Sample Data
            </h2>
            <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
              We can create sample tasks to help you explore Questboard's features.
              This includes:
            </p>

            <div style={{
              background: '#f0f7ff',
              border: '2px solid #667eea',
              borderRadius: '8px',
              padding: '20px',
              margin: '20px 0'
            }}>
              <ul style={{ color: '#333', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                <li>1 sample goal: "Complete Questboard Onboarding"</li>
                <li>1 questline: "Getting Started Journey"</li>
                <li>1 quest: "Learn the Basics"</li>
                <li>5 tutorial tasks to explore the interface</li>
              </ul>
            </div>

            <p style={{ color: '#888', fontSize: '14px', fontStyle: 'italic' }}>
              You can delete all sample data anytime from the interface.
            </p>

            {error && (
              <div style={{
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                color: '#c33'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={handleCreateSampleData}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#5568d3')}
                onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = '#667eea')}
              >
                {isLoading ? 'Creating...' : 'Create Sample Data'}
              </button>

              <button
                onClick={handleSkipSampleData}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'white',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#f8f9fa')}
                onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = 'white')}
              >
                Skip & Start Fresh
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ marginTop: 0, color: '#333', fontSize: '24px' }}>
              You're All Set!
            </h2>
            <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
              Your workspace is ready. Head to the Today view to see your tasks
              and start organizing your work.
            </p>

            <div style={{
              background: '#f8f9fa',
              borderRadius: '8px',
              padding: '20px',
              margin: '24px 0',
              textAlign: 'left'
            }}>
              <h3 style={{ marginTop: 0, color: '#333', fontSize: '16px' }}>
                Pro Tips:
              </h3>
              <ul style={{ color: '#666', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                <li>Use the <strong>Team</strong> page to add members and set Working Genius profiles</li>
                <li>Try <strong>Sprint</strong> to generate AI-powered sprint plans</li>
                <li>Check <strong>Analytics</strong> to track team velocity and capacity</li>
                <li>Install as a PWA for offline access on mobile</li>
              </ul>
            </div>

            <button
              onClick={handleFinish}
              style={{
                width: '100%',
                padding: '14px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
            >
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
