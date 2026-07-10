import React, { useState, useEffect } from 'react';
import axios from 'axios';

// The GSE Annex 6 Sector Starter Kits
const SECTOR_KITS = {
  'Telecommunications': [
    { id: 101, name: 'Network Quality', x: 9, y: 9, color: '#1976d2' },
    { id: 102, name: 'Data Privacy & Security', x: 9, y: 10, color: '#d32f2f' },
    { id: 103, name: 'Electronic Waste', x: 7, y: 8, color: '#388e3c' },
    { id: 104, name: 'Energy Consumption', x: 8, y: 6, color: '#fbc02d' },
    { id: 105, name: 'Digital Inclusion', x: 6, y: 8, color: '#7b1fa2' }
  ],
  'Banking': [
    { id: 201, name: 'Financial Inclusion', x: 7, y: 9, color: '#1976d2' },
    { id: 202, name: 'Cyber Security', x: 10, y: 10, color: '#d32f2f' },
    { id: 203, name: 'Responsible Investment', x: 9, y: 8, color: '#388e3c' },
    { id: 204, name: 'Consumer Protection', x: 8, y: 9, color: '#f57c00' },
    { id: 205, name: 'Anti-Corruption', x: 9, y: 7, color: '#7b1fa2' }
  ],
  'Agriculture': [
    { id: 301, name: 'Food Security', x: 9, y: 9, color: '#388e3c' },
    { id: 302, name: 'Water & Effluents', x: 9, y: 8, color: '#1976d2' },
    { id: 303, name: 'Soil Management', x: 8, y: 7, color: '#5d4037' },
    { id: 304, name: 'Child Labour', x: 10, y: 10, color: '#d32f2f' },
    { id: 305, name: 'Deforestation', x: 8, y: 9, color: '#fbc02d' }
  ],
  'Energy & Mining': [
    { id: 401, name: 'Occupational Health & Safety', x: 10, y: 10, color: '#d32f2f' },
    { id: 402, name: 'Carbon Emissions', x: 9, y: 9, color: '#495057' },
    { id: 403, name: 'Land Rehabilitation', x: 8, y: 8, color: '#388e3c' },
    { id: 404, name: 'Community Impacts', x: 7, y: 9, color: '#f57c00' },
    { id: 405, name: 'Biodiversity', x: 8, y: 7, color: '#1976d2' }
  ],
  'Insurance': [
    { id: 501, name: 'Sustainable Underwriting', x: 10, y: 9, color: '#1976d2' },
    { id: 502, name: 'Climate Stress Testing', x: 9, y: 10, color: '#d32f2f' },
    { id: 503, name: 'Portfolio ESG Screening', x: 8, y: 8, color: '#388e3c' },
    { id: 504, name: 'Data Privacy & Security', x: 9, y: 9, color: '#f57c00' },
    { id: 505, name: 'Green Fleet Transition', x: 6, y: 7, color: '#7b1fa2' }
  ],
};

function SectorOnboarding() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedSector, setSelectedSector] = useState('Banking');
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/organizations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrganizations(res.data);
        if (res.data.length > 0) setSelectedOrg(res.data[0].unit_id);
      } catch (err) {
        console.error("Failed to load orgs", err);
      }
    };
    fetchOrgs();
  }, []);

  const handleDeployKit = async () => {
    if (!selectedOrg) return alert("Please create and select an organization unit first.");
    
    setIsDeploying(true);
    try {
      const token = localStorage.getItem('token');
      const kitToDeploy = SECTOR_KITS[selectedSector];
      const currentYear = new Date().getFullYear();

      // We added the overwrite_all flag right here!
      await axios.post('/api/materiality', {
        organization_id: selectedOrg,
        assessment_year: currentYear,
        topics: kitToDeploy,
        overwrite_all: true 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`✅ ${selectedSector} Starter Kit successfully deployed!`);
      window.location.reload(); 
    } catch (error) {
      console.error("Deploy failed:", error);
      alert("Failed to deploy starter kit.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div style={{ padding: '25px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #cce5ff', marginBottom: '40px' }}>
      <h2 style={{ marginTop: 0, color: '#004085', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🚀 GSE Sector-Specific Onboarding
      </h2>
      <p style={{ color: '#0056b3', marginBottom: '20px' }}>
        Instantly provision your workspace with the mandatory tracking metrics recommended by the Ghana Stock Exchange for your specific industry.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px', color: '#004085' }}>1. Select Organization</label>
          <select 
            value={selectedOrg} 
            onChange={(e) => setSelectedOrg(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #b8daff' }}
          >
            {organizations.map(org => <option key={org.unit_id} value={org.unit_id}>{org.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px', color: '#004085' }}>2. Select Industry Sector</label>
          <select 
            value={selectedSector} 
            onChange={(e) => setSelectedSector(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #b8daff', fontWeight: 'bold' }}
          >
            {Object.keys(SECTOR_KITS).map(sector => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '15px', borderRadius: '4px', border: '1px solid #cce5ff', marginBottom: '20px' }}>
        <h4 style={{ marginTop: 0, color: '#004085', marginBottom: '10px' }}>Included in the {selectedSector} Kit:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {SECTOR_KITS[selectedSector].map(topic => (
            <span key={topic.id} style={{ background: '#e2e3e5', color: '#383d41', padding: '5px 10px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold' }}>
              {topic.name}
            </span>
          ))}
        </div>
      </div>

      <button 
        onClick={handleDeployKit}
        disabled={isDeploying}
        style={{ background: '#0056b3', color: 'white', padding: '12px 25px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isDeploying ? 'wait' : 'pointer', transition: 'background 0.2s' }}
      >
        {isDeploying ? '⏳ Provisioning Workspace...' : `⚡ Deploy ${selectedSector} Kit`}
      </button>
    </div>
  );
}

export default SectorOnboarding;