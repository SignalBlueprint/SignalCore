import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import TodayPage from './pages/TodayPage';
import SprintPage from './pages/SprintPage';
import DebugPage from './pages/DebugPage';
import TeamPage from './pages/TeamPage';
import TeamIntakePage from './pages/TeamIntakePage';
import GoalsPage from './pages/GoalsPage';
import AssignmentReviewPage from './pages/AssignmentReviewPage';
import TaskDetailPage from './pages/TaskDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import JobsPage from './pages/JobsPage';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
        padding: '0 env(safe-area-inset-right, 0) 0 env(safe-area-inset-left, 0)'
      }}>
        <Nav />
        <Routes>
          <Route path="/" element={<ErrorBoundary><TodayPage /></ErrorBoundary>} />
          <Route path="/today" element={<ErrorBoundary><TodayPage /></ErrorBoundary>} />
          <Route path="/sprint" element={<ErrorBoundary><SprintPage /></ErrorBoundary>} />
          <Route path="/team" element={<ErrorBoundary><TeamPage /></ErrorBoundary>} />
          <Route path="/team/intake" element={<ErrorBoundary><TeamIntakePage /></ErrorBoundary>} />
          <Route path="/goals" element={<ErrorBoundary><GoalsPage /></ErrorBoundary>} />
          <Route path="/goals/:goalId" element={<ErrorBoundary><GoalsPage /></ErrorBoundary>} />
          <Route path="/goals/:goalId/assignment-review" element={<ErrorBoundary><AssignmentReviewPage /></ErrorBoundary>} />
          <Route path="/tasks/:taskId" element={<ErrorBoundary><TaskDetailPage /></ErrorBoundary>} />
          <Route path="/analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
          <Route path="/jobs" element={<ErrorBoundary><JobsPage /></ErrorBoundary>} />
          <Route path="/debug" element={<ErrorBoundary><DebugPage /></ErrorBoundary>} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;

