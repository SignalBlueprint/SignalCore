import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import LibraryPage from './pages/LibraryPage';
import ReaderPage from './pages/ReaderPage';
import BookDetailPage from './pages/BookDetailPage';
import AnnotationsPage from './pages/AnnotationsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="annotations" element={<AnnotationsPage />} />
        <Route path="books/:id" element={<BookDetailPage />} />
      </Route>
      <Route path="/read/:id" element={<ReaderPage />} />
    </Routes>
  );
}

export default App;
