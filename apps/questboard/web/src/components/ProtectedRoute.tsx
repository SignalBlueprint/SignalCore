import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

export default function ProtectedRoute({ children, skipOnboardingCheck = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(!skipOnboardingCheck);
  const location = useLocation();

  useEffect(() => {
    if (!skipOnboardingCheck && isAuthenticated && !isLoading) {
      // Check onboarding status
      apiClient.get('/api/onboarding/status')
        .then((response: any) => {
          setOnboardingCompleted(response.completed);
          setCheckingOnboarding(false);
        })
        .catch((error) => {
          console.error('Error checking onboarding status:', error);
          // If we can't check status, assume onboarding is completed to avoid blocking users
          setOnboardingCompleted(true);
          setCheckingOnboarding(false);
        });
    }
  }, [isAuthenticated, isLoading, skipOnboardingCheck]);

  if (isLoading || checkingOnboarding) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed (and not already on onboarding page)
  if (!skipOnboardingCheck && onboardingCompleted === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
