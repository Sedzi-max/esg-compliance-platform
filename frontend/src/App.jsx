import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Metrics from './pages/Metrics'; 
import DataEntry from './pages/DataEntry';

function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100vh' }}>
      
      {/* Sidebar Navigation */}
      <nav style={{ width: '250px', background: '#212529', color: 'white', padding: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '30px', borderBottom: '1px solid #495057', paddingBottom: '10px' }}>
          ESG Platform
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <li>
            <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>📊 Dashboard</Link>
          </li>
          <li>
            <Link to="/organizations" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>🏢 Organizations</Link>
          </li>
          <li>
            <Link to="/metrics" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>⚙️ Metrics Config</Link>
          </li>
          <li>
            {/* Added Data Entry Link */}
            <Link to="/data-entry" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>📝 Data Entry</Link>
          </li>
        </ul>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px', background: '#ffffff' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/metrics" element={<Metrics />} />
          {/* Added Data Entry Route */}
          <Route path="/data-entry" element={<DataEntry />} />
        </Routes>
      </main>

    </div>
  );
}

export default App;