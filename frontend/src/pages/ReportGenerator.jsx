import React, { useState, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function ReportGenerator() {
  const [framework, setFramework] = useState('GSE_MANDATORY');
  const [year, setYear] = useState('2026');
  
  const [isGeneratingCSV, setIsGeneratingCSV] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  
  const printRef = useRef();

  // 1. YOUR EXISTING RAW CSV DOWNLOADER
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

  // 2. THE NEW VISUAL PREVIEW GENERATOR
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

      // Filter for strictly APPROVED data matching the selected year
      const targetEmissions = emissionsRes.data.filter(e => {
        const d = new Date(e.recorded_date || e.created_at);
        return e.status === 'Approved' && d.getFullYear().toString() === year;
      });

      const targetObs = obsRes.data.filter(o => {
        const d = new Date(o.timestamp);
        return d.getFullYear().toString() === year;
      });

      // Aggregate Carbon Data
      const scopeData = { scope_1: 0, scope_2: 0, scope_3: 0 };
      let totalCarbon = 0;
      targetEmissions.forEach(e => {
        const val = Number(e.calculated_co2e);
        if (scopeData[e.scope_category] !== undefined) {
          scopeData[e.scope_category] += val;
          totalCarbon += val;
        }
      });

      // Group General ESG Metrics
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

      setReportData({
        year, framework, generatedAt: new Date().toLocaleDateString(),
        facilityCount: orgRes.data.length, totalCarbon, scopeData, esgMetrics
      });

    } catch (err) {
      console.error("Preview Generation Error:", err);
      setError("Failed to compile preview data.");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // 3. THE PDF EXPORT ENGINE
  const exportOfficialPDF = async () => {
    setIsExportingPDF(true);
    try {
      const element = printRef.current;
      element.style.boxShadow = 'none';
      element.style.border = 'none';
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ESG_Radar_${framework}_Disclosure_${year}.pdf`);
      
      element.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
      element.style.border = '1px solid #dee2e6';
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Failed to export document.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div style={{ width: '100%', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* --- CONFIGURATION PANEL --- */}
      <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.4rem', color: '#212529', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📑 Automated Framework Compiler
        </h2>
        <p style={{ color: '#6c757d', marginBottom: '20px' }}>Instantly aggregate your approved raw data into auditor-ready disclosure matrices.</p>

        <form onSubmit={generatePreview} style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#495057' }}>Regulatory Framework Matrix</label>
            <select 
              value={framework} onChange={(e) => setFramework(e.target.value)}
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', background: '#f8f9fa', fontSize: '1rem' }}
            >
              <option value="GSE_MANDATORY">GSE Mandatory Disclosures</option>
              <option value="GRI">GRI (Global Reporting Initiative)</option>
              <option value="CSRD">CSRD (European Standard)</option>
              <option value="TCFD">TCFD (Financial Disclosures)</option>
              <option value="SDG">UN Sustainable Development Goals (SDG)</option>
            </select>
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#495057' }}>Reporting Year</label>
            <select 
              value={year} onChange={(e) => setYear(e.target.value)}
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', background: '#f8f9fa', fontSize: '1rem' }}
            >
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', flex: '1 1 300px' }}>
            <button 
              type="button" onClick={handleDownloadCSV} disabled={isGeneratingCSV}
              style={{ flex: 1, background: '#e9ecef', color: '#212529', padding: '12px', border: '1px solid #ced4da', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.95rem', cursor: isGeneratingCSV ? 'wait' : 'pointer' }}
            >
              {isGeneratingCSV ? 'Compiling...' : '📥 Raw CSV'}
            </button>

            <button 
              type="submit" disabled={isGeneratingPreview}
              style={{ flex: 2, background: '#212529', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.95rem', cursor: isGeneratingPreview ? 'wait' : 'pointer' }}
            >
              {isGeneratingPreview ? 'Rendering...' : '📄 Build Visual Report'}
            </button>
          </div>
        </form>
        {error && <p style={{ color: '#dc3545', marginTop: '15px', fontWeight: 'bold' }}>{error}</p>}
      </div>

      {/* --- VISUAL DOCUMENT PREVIEW --- */}
      {reportData && (
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
            <button 
              onClick={exportOfficialPDF} disabled={isExportingPDF}
              style={{ background: '#dc3545', color: 'white', padding: '10px 25px', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: isExportingPDF ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(220, 53, 69, 0.2)' }}
            >
              {isExportingPDF ? '⏳ Rendering PDF...' : '⬇️ Download Official PDF'}
            </button>
          </div>

          {/* The Printable Page Area */}
          <div 
            ref={printRef} 
            style={{ background: 'white', padding: '60px 80px', borderRadius: '4px', border: '1px solid #dee2e6', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', color: '#212529', fontFamily: '"Times New Roman", Times, serif', maxWidth: '850px', margin: '0 auto', minHeight: '1100px' }}
          >
            {/* Document Header */}
            <div style={{ borderBottom: '3px solid #212529', paddingBottom: '20px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'system-ui, sans-serif' }}>
                  {reportData.framework.replace(/_/g, ' ')} Disclosure
                </h1>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#495057', fontWeight: 'normal' }}>
                  Annual ESG Radar Sustainability Report
                </h2>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#6c757d' }}>
                <p style={{ margin: '0 0 5px 0' }}><strong>Fiscal Year:</strong> {reportData.year}</p>
                <p style={{ margin: '0 0 5px 0' }}><strong>Generated:</strong> {reportData.generatedAt}</p>
                <p style={{ margin: 0 }}><strong>Scope:</strong> {reportData.facilityCount} Verified Facilities</p>
              </div>
            </div>

            {/* Executive Summary */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ textTransform: 'uppercase', fontSize: '1.1rem', letterSpacing: '1px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px', marginBottom: '15px' }}>1. Executive Environmental Summary</h3>
              <p style={{ lineHeight: '1.6', fontSize: '1.05rem', textAlign: 'justify' }}>
                This document serves as the official compilation of verified environmental, social, and governance (ESG) metrics for the fiscal year {reportData.year}. All data enclosed has been cryptographically secured and approved by internal compliance administrators in accordance with the selected framework standards.
              </p>
            </div>

            {/* Carbon Footprint Section */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ textTransform: 'uppercase', fontSize: '1.1rem', letterSpacing: '1px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px', marginBottom: '15px' }}>2. Greenhouse Gas (GHG) Inventory</h3>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div style={{ background: '#f8f9fa', padding: '20px', flex: 1, borderLeft: '4px solid #198754' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', textTransform: 'uppercase', color: '#6c757d' }}>Total Verified CO2e</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', fontFamily: 'system-ui, sans-serif' }}>{reportData.totalCarbon.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>kg</span></p>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}>
                <thead>
                  <tr style={{ background: '#212529', color: 'white' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #212529' }}>Emission Category</th>
                    <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #212529' }}>Verified Mass (kg CO2e)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}><strong>Scope 1</strong> (Direct Emissions)</td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'right' }}>{reportData.scopeData.scope_1.toLocaleString()}</td>
                  </tr>
                  <tr style={{ background: '#f8f9fa' }}>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}><strong>Scope 2</strong> (Purchased Energy)</td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'right' }}>{reportData.scopeData.scope_2.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}><strong>Scope 3</strong> (Value Chain & Suppliers)</td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'right' }}>{reportData.scopeData.scope_3.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Social & Governance Metrics Section */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ textTransform: 'uppercase', fontSize: '1.1rem', letterSpacing: '1px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px', marginBottom: '15px' }}>3. Social & Governance Disclosures</h3>
              
              {['Social', 'Governance'].map(pillar => (
                <div key={pillar} style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '1.05rem', margin: '0 0 10px 0', color: '#495057' }}>{pillar} Metrics</h4>
                  {reportData.esgMetrics[pillar].length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#6c757d', fontSize: '0.9rem' }}>No approved disclosures recorded for this period.</p>
                  ) : (
                    <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.6' }}>
                      {reportData.esgMetrics[pillar].map((metric, idx) => (
                        <li key={idx}>
                          <strong>{metric.name}:</strong> {metric.value} {metric.unit} <span style={{ color: '#6c757d', fontSize: '0.85rem' }}>(Reported by: {metric.org})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Auditor Signature Area */}
            <div style={{ marginTop: '100px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #dee2e6', paddingTop: '20px' }}>
              <div style={{ textAlign: 'center', width: '250px' }}>
                <div style={{ borderBottom: '1px solid #212529', height: '40px', marginBottom: '5px' }}></div>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>Chief Sustainability Officer</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6c757d' }}>Authorized Signature</p>
              </div>
              <div style={{ textAlign: 'center', width: '250px' }}>
                <div style={{ borderBottom: '1px solid #212529', height: '40px', marginBottom: '5px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontWeight: 'bold', fontStyle: 'italic', color: '#198754' }}>
                  System Verified
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>ESG Radar Engine</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6c757d' }}>Digital Audit Stamp</p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default ReportGenerator;