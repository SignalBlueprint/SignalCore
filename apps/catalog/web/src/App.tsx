import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import UploadPage from './pages/UploadPage';
import InventoryPage from './pages/InventoryPage';
import LookbooksPage from './pages/LookbooksPage';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navigation />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<ProductsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/lookbooks" element={<LookbooksPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
