import React, { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

function ReportGenerator() {
  const [framework, setFramework] = useState('GRI');
  const [year, setYear] = useState('2026'); // Defaulting to your current reporting year
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      
      // Call the backend compiler route
      const response = await axios.get(`/api/reports/framework?framework=${framework}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const reportData = response.data;

      if (reportData.length === 0) {
        alert(`No approved data found for ${framework} in ${year}. Ensure your data is Approved in the Audit Queue!`);
        setIsGenerating(false);
        return;
      }

      // Convert the JSON data into a clean CSV string
      const csvString = Papa.unparse(reportData);

      // Create an invisible download link and click it
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${framework}_Compliance_Report_${year}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to generate report. Check your console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ padding: '25px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0, color: '#212529', marginBottom: '10px' }}>Automated Framework Compiler</h2>
      <p style={{ color: '#6c757d', fontSize: '0.9rem', marginBottom: '20px' }}>
        Instantly aggregate your approved raw data into auditor-ready disclosure matrices.
      </p>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px', color: '#495057' }}>Select Framework</label>
          <select 
            value={framework} 
            onChange={(e) => setFramework(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="GRI">GRI (Global Reporting Initiative)</option>
            <option value="CSRD">CSRD (European Standard)</option>
            <option value="TCFD">TCFD (Financial Disclosures)</option>
            <option value="GSE_MANDATORY">GSE Mandatory Disclosures</option>
            <option value="SDG">UN Sustainable Development Goals (SDG)</option>
        
          </select>
        </div>

        <div style={{ width: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px', color: '#495057' }}>Reporting Year</label>
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="2023">2023</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
      </div>

      <button 
        onClick={handleDownload}
        disabled={isGenerating}
        style={{ width: '100%', background: '#0d6efd', color: 'white', padding: '14px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isGenerating ? 'wait' : 'pointer', fontSize: '1rem', transition: 'background 0.2s' }}
      >
        {isGenerating ? 'Compiling Engine...' : `📥 Download ${framework} ${year} Report (CSV)`}
      </button>
    </div>
  );
}

export default ReportGenerator;