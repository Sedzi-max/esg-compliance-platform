import React, { useState, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- NEW: THE COMPLIANCE MAPPING ENGINE ---
// This dictionary tells the system what metrics are required for each framework
const FRAMEWORK_REQUIREMENTS = {
  GSE_MANDATORY: [
    { code: 'GSE-E1', name: 'Total GHG Emissions (Scope 1 & 2)', check: data => (data.scopeData.scope_1 + data.scopeData.scope_2) > 0 },
    { code: 'GSE-S1', name: 'Employee Diversity & Inclusion', check: data => data.esgMetrics.Social.length > 0 },
    { code: 'GSE-G1', name: 'Board Independence Metrics', check: data => data.esgMetrics.Governance.length > 0 }
  ],
  GRI: [
    { code: 'GRI 305-1', name: 'Direct (Scope 1) GHG emissions', check: data => data.scopeData.scope_1 > 0 },
    { code: 'GRI 305-2', name: 'Energy indirect (Scope 2) GHG emissions', check: data => data.scopeData.scope_2 > 0 },
    { code: 'GRI 305-3', name: 'Other indirect (Scope 3) GHG emissions', check: data => data.scopeData.scope_3 > 0 },
    { code: 'GRI 306-3', name: 'Waste generated', check: data => data.esgMetrics.Environmental.some(m => m.name.toLowerCase().includes('waste')) }
  ],
  CSRD: [
    { code: 'ESRS E1-6', name: 'Gross Scopes 1, 2, 3 and Total GHG emissions', check: data => data.totalCarbon > 0 },
    { code: 'ESRS S1', name: 'Own Workforce Disclosures', check: data => data.esgMetrics.Social.length > 0 },
    { code: 'ESRS G1', name: 'Business Conduct', check: data => data.esgMetrics.Governance.length > 0 }
  ],
  TCFD: [
    { code: 'TCFD Metrics-B', name: 'Disclose Scope 1, Scope 2, and, if appropriate, Scope 3', check: data => data.totalCarbon > 0 },
    { code: 'TCFD Strategy-A', name: 'Climate-related risks and opportunities', check: data => data.esgMetrics.Governance.some(m => m.name.toLowerCase().includes('risk')) }
  ],
  SDG: [
    { code: 'SDG 13', name: 'Climate Action (GHG Tracking)', check: data => data.totalCarbon > 0 },
    { code: 'SDG 5', name: 'Gender Equality', check: data => data.esgMetrics.Social.some(m => m.name.toLowerCase().includes('gender') || m.name.toLowerCase().includes('diversity')) }
  ]
};

function ReportGenerator() {
  const [framework, setFramework] = useState('GSE_MANDATORY');
  const [year, setYear] = useState('2026');
  
  const [isGeneratingCSV, setIsGeneratingCSV] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  
  const printRef = useRef();

  const handleDownloadCSV = async () => {
    setIsGeneratingCSV(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/reports/framework?framework=${framework}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      if (data.length === 0) {
        setError(`No approved data found for ${framework} in ${year}.`);
        return;
      }

      const csvString = Papa.unparse(data);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${framework}_Compliance_Report_${year}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("CSV Download failed:", err);
      setError("Failed to generate raw CSV report.");
    } finally {
      setIsGeneratingCSV(false);
    }
  };

  const generatePreview = async (e) => {
    e.preventDefault();
    setIsGeneratingPreview(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [orgRes, emissionsRes, obsRes] = await Promise.all([
        axios.get('/api/organizations', config).catch(() => ({ data: [] })),
        axios.get('/api/emissions', config).catch(() => ({ data: [] })),
        axios.get('/api/observations', config).catch(() => ({ data: [] }))
      ]);

      const targetEmissions = emissionsRes.data.filter(e => {
        const d = new Date(e.recorded_date || e.created_at);
        return e.status === 'Approved' && d.getFullYear().toString() === year;
      });

      const targetObs = obsRes.data.filter(o => {
        const d = new Date(o.timestamp);
        return d.getFullYear().toString() === year;
      });

      const scopeData = { scope_1: 0, scope_2: 0, scope_3: 0 };
      let totalCarbon = 0;
      targetEmissions.forEach(e => {
        const val = Number(e.calculated_co2e);
        if (scopeData[e.scope_category] !== undefined) {
          scopeData[e.scope_category] += val;
          totalCarbon += val;
        }
      });

      const esgMetrics = { Environmental: [], Social: [], Governance: [] };
      targetObs.forEach(o => {
        const metricObj = {
          name: o.metric_name, value: o.numeric_value !== null ? o.numeric_value : o.text_value,
          unit: o.unit_of_measure, org: o.organization_name
        };
        if (o.pillar === 'E') esgMetrics.Environmental.push(metricObj);
        if (o.pillar === 'S') esgMetrics.Social.push(metricObj);
        if (o.pillar === 'G') esgMetrics.Governance.push(metricObj);
      });

      // --- NEW: Execute Gap Analysis ---
      const unformattedData = { scopeData, totalCarbon, esgMetrics };
      const requirements = FRAMEWORK_REQUIREMENTS[framework] || [];
      
      const complianceResults = requirements.map(req => ({
        ...req,
        fulfilled: req.check(unformattedData)
      }));

      const complianceScore = complianceResults.length > 0 
        ? Math.round((complianceResults.filter(r => r.fulfilled).length / complianceResults.length) * 100)
        : 100;

      setReportData({
        year, framework, generatedAt: new Date().toLocaleDateString(),
        facilityCount: orgRes.data.length, totalCarbon, scopeData, esgMetrics,
        complianceResults, complianceScore // Inject the analysis into state
      });

    } catch (err) {
      console.error("Preview Generation Error:", err);
      setError("Failed to compile preview data.");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const exportOfficialPDF = async () => {
    setIsExportingPDF(true);
    try {
      const element = printRef.current;
      
      const originalBoxShadow = element.style.boxShadow;
      element.style.boxShadow = 'none';
      element.style.border = 'none';
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ESG_Radar_${framework}_Disclosure_${year}.pdf`);
      
      element.style.boxShadow = originalBoxShadow;
      element.style.border = '1px solid #e5e7eb';
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Failed to export document.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div style={{ width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #e5e7eb', marginBottom: '40px' }}>
        <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', color: '#111827', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700' }}>
            📑 Automated Framework Compiler
            </h2>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '15px' }}>Instantly aggregate your approved raw data into auditor-ready disclosure matrices.</p>
        </div>

        <form onSubmit={generatePreview} style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>Regulatory Framework Matrix</label>
            <select value={framework} onChange={(e) => setFramework(e.target.value)} style={inputStyle}>
              <option value="GSE_MANDATORY">GSE Mandatory Disclosures</option>
              <option value="GRI">GRI (Global Reporting Initiative)</option>
              <option value="CSRD">CSRD (European Standard)</option>
              <option value="TCFD">TCFD (Financial Disclosures)</option>
              <option value="SDG">UN Sustainable Development Goals (SDG)</option>
            </select>
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>Reporting Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} style={inputStyle}>
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', flex: '1 1 300px' }}>
            <button type="button" onClick={handleDownloadCSV} disabled={isGeneratingCSV} style={secondaryButtonStyle}>
              {isGeneratingCSV ? 'Compiling...' : '📥 Raw CSV'}
            </button>

            <button type="submit" disabled={isGeneratingPreview} style={primaryButtonStyle}>
              {isGeneratingPreview ? 'Rendering...' : '📄 Build Visual Report'}
            </button>
          </div>
        </form>
        {error && <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginTop: '20px', fontSize: '14px', border: '1px solid #fecaca' }}>⚠️ {error}</div>}
      </div>

      {reportData && (
        <div style={{ position: 'relative', padding: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <button onClick={exportOfficialPDF} disabled={isExportingPDF} style={{...primaryButtonStyle, backgroundColor: '#dc2626', padding: '10px 24px'}}>
              {isExportingPDF ? '⏳ Rendering PDF...' : '⬇️ Download Official PDF'}
            </button>
          </div>

          <div 
            ref={printRef} 
            style={{ 
                background: 'white', padding: '80px', borderRadius: '8px', border: '1px solid #e5e7eb', 
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', 
                color: '#111827', fontFamily: '"Georgia", Times, serif', maxWidth: '850px', 
                margin: '0 auto', minHeight: '1100px' 
            }}
          >
            {/* Document Header */}
            <div style={{ borderBottom: '2px solid #111827', paddingBottom: '24px', marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800' }}>
                  {reportData.framework.replace(/_/g, ' ')} Disclosure
                </h1>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#4b5563', fontWeight: '500', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  Annual Corporate Sustainability Report
                </h2>
              </div>
              <div style={{ textAlign: 'right', fontSize: '14px', color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.6' }}>
                <p style={{ margin: 0 }}><strong>Fiscal Year:</strong> {reportData.year}</p>
                <p style={{ margin: 0 }}><strong>Generated:</strong> {reportData.generatedAt}</p>
                <p style={{ margin: 0 }}><strong>Scope:</strong> {reportData.facilityCount} Verified Facilities</p>
              </div>
            </div>

            {/* --- NEW: COMPLIANCE GAP ANALYSIS SECTION --- */}
            <div style={{ marginBottom: '48px', padding: '24px', backgroundColor: reportData.complianceScore === 100 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${reportData.complianceScore === 100 ? '#a7f3d0' : '#fecaca'}`, borderRadius: '8px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#111827', textTransform: 'uppercase', fontWeight: '700' }}>Automated Gap Analysis</h3>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: reportData.complianceScore === 100 ? '#059669' : '#dc2626' }}>
                        {reportData.complianceScore}% Compliant
                    </div>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <tbody>
                        {reportData.complianceResults.map((req, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px 0', width: '30px' }}>
                                    {req.fulfilled ? '✅' : '❌'}
                                </td>
                                <td style={{ padding: '12px 0', fontWeight: '600', color: '#374151', width: '150px' }}>
                                    {req.code}
                                </td>
                                <td style={{ padding: '12px 0', color: '#6b7280' }}>
                                    {req.name}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Carbon Footprint Section */}
            <div style={{ marginBottom: '48px' }}>
              <h3 style={sectionHeaderStyle}>1. Greenhouse Gas (GHG) Inventory</h3>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                <div style={{ background: '#f9fafb', padding: '24px', flex: 1, borderLeft: '4px solid #10b981', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', fontWeight: '700', fontFamily: 'system-ui, sans-serif' }}>Total Verified CO2e</p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: '800', fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
                    {reportData.totalCarbon.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: '500', color: '#6b7280' }}>kg</span>
                  </p>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', fontFamily: 'system-ui, sans-serif' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', color: '#374151', borderTop: '2px solid #d1d5db', borderBottom: '2px solid #d1d5db' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Emission Category</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Verified Mass (kg CO2e)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '16px 12px', borderBottom: '1px solid #e5e7eb', color: '#111827' }}><strong>Scope 1</strong> (Direct Emissions)</td>
                    <td style={{ padding: '16px 12px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', color: '#4b5563', fontFamily: 'monospace', fontSize: '15px' }}>{reportData.scopeData.scope_1.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '16px 12px', borderBottom: '1px solid #e5e7eb', color: '#111827' }}><strong>Scope 2</strong> (Purchased Energy)</td>
                    <td style={{ padding: '16px 12px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', color: '#4b5563', fontFamily: 'monospace', fontSize: '15px' }}>{reportData.scopeData.scope_2.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '16px 12px', borderBottom: '1px solid #e5e7eb', color: '#111827' }}><strong>Scope 3</strong> (Value Chain & Suppliers)</td>
                    <td style={{ padding: '16px 12px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', color: '#4b5563', fontFamily: 'monospace', fontSize: '15px' }}>{reportData.scopeData.scope_3.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Social & Governance Metrics Section */}
            <div style={{ marginBottom: '48px' }}>
              <h3 style={sectionHeaderStyle}>2. Social & Governance Disclosures</h3>
              
              {['Social', 'Governance'].map(pillar => (
                <div key={pillar} style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', margin: '0 0 12px 0', color: '#111827', fontFamily: 'system-ui, sans-serif' }}>{pillar} Metrics</h4>
                  {reportData.esgMetrics[pillar].length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#9ca3af', fontSize: '14px', margin: 0 }}>No approved disclosures recorded for this period.</p>
                  ) : (
                    <ul style={{ paddingLeft: '24px', margin: 0, lineHeight: '1.8', color: '#374151', fontSize: '15px' }}>
                      {reportData.esgMetrics[pillar].map((metric, idx) => (
                        <li key={idx} style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#111827' }}>{metric.name}:</strong> {metric.value} {metric.unit} 
                          <span style={{ color: '#6b7280', fontSize: '13px', marginLeft: '8px', fontFamily: 'system-ui, sans-serif' }}>(Reported by: {metric.org})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Auditor Signature Area */}
            <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d1d5db', paddingTop: '32px', fontFamily: 'system-ui, sans-serif' }}>
              <div style={{ textAlign: 'center', width: '250px' }}>
                <div style={{ borderBottom: '1px solid #9ca3af', height: '50px', marginBottom: '8px' }}></div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#111827' }}>Chief Sustainability Officer</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Authorized Signature</p>
              </div>
              <div style={{ textAlign: 'center', width: '250px' }}>
                <div style={{ borderBottom: '1px solid #9ca3af', height: '50px', marginBottom: '8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontWeight: '800', fontStyle: 'italic', color: '#10b981', fontSize: '18px', letterSpacing: '0.05em' }}>
                  System Verified
                </div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#111827' }}>ESG Radar Engine</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Digital Audit Stamp</p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Reusable Styles
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', backgroundColor: '#f9fafb', boxSizing: 'border-box', outline: 'none', color: '#111827', fontWeight: '500' };
const primaryButtonStyle = { flex: 2, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#111827', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: 'background-color 0.2s' };
const secondaryButtonStyle = { flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', color: '#374151', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background-color 0.2s' };
const sectionHeaderStyle = { textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.1em', borderBottom: '1px solid #d1d5db', paddingBottom: '8px', marginBottom: '24px', color: '#4b5563', fontFamily: 'system-ui, sans-serif', fontWeight: '700' };

export default ReportGenerator;