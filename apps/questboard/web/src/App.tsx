import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import TodayPage from './pages/TodayPage';
import SprintPage from './pages/SprintPage';
import DebugPage from './pages/DebugPage';
import TeamPage from './pages/TeamPage';
import TeamIntakePage from './pages/TeamIntakePage';
import GoalsPage from './pages/GoalsPage';
import AssignmentReviewPage from './pages/AssignmentReviewPage';

function App() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <Nav />
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/sprint" element={<SprintPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/team/intake" element={<TeamIntakePage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/:goalId" element={<GoalsPage />} />
        <Route path="/goals/:goalId/assignment-review" element={<AssignmentReviewPage />} />
        <Route path="/debug" element={<DebugPage />} />
      </Routes>
    </div>
  );
}

export default App;

