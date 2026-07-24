import React, { useState, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// FIX: "GSE-Aligned Report Generator output" from the Consultant Review — the
// existing flat clause-table format (single year, fulfilled/missing + total_co2e)
// is the wrong shape for what GSE's own manual actually wants: material topic
// narratives, real KPI values (not just a checkmark), and multi-year trends.
// GSE_FRAMEWORK is re-added to the dropdown here, but routed through an entirely
// different rendering path — Banking/Insurance keep the exact layout they had.
const GSE_FRAMEWORK = 'GSE ESG Disclosures Guidance Manual';

function ReportGenerator() {
  // FIX: dropdown now only lists frameworks that actually have clauses
  // seeded in Framework_Mappings (confirmed via DB query: Bank of Ghana
  // Sustainable Banking Principles, NIC Insurance Guidelines, GSE ESG
  // Disclosures Guidance Manual).
  const [framework, setFramework] = useState('Bank of Ghana Sustainable Banking Principles');
  const [year, setYear] = useState('2026');

  const [isGeneratingCSV, setIsGeneratingCSV] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  const printRef = useRef();

  const isGSE = framework === GSE_FRAMEWORK;

  const handleDownloadCSV = async () => {
    if (isGeneratingCSV) return; // guard against double-click
    setIsGeneratingCSV(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/reports/gap-analysis?framework=${encodeURIComponent(framework)}&year=${encodeURIComponent(year)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data;
      if (data.length === 0) {
        setError(`No mapping data found for ${framework} in ${year}.`);
        return;
      }

      const csvString = Papa.unparse(data);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${framework.replace(/[/ ]/g, '_')}_Compliance_Report_${year}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("CSV Download failed:", err);
      setError("Failed to generate raw CSV report. Please try again.");
    } finally {
      setIsGeneratingCSV(false);
    }
  };

  // FIX: reusable value formatter for the GSE report — handles the SUM-vs-AVG
  // aggregation split (volumes vs percentages) so numbers read naturally.
  const formatValue = (val, unit) => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ' ' + unit : ''}`;
  };

  // FIX: builds a real, data-driven narrative sentence per clause — computed
  // from actual reported values and year-over-year change, not filler text.
  const buildNarrative = (clause, years) => {
    const currentYear = years[years.length - 1];
    const priorYear = years[years.length - 2];
    const currentVal = clause.byYear[currentYear];
    const priorVal = clause.byYear[priorYear];
    const verb = clause.aggregation_type === 'AVG' ? 'averaged' : 'totaled';

    if (currentVal === null || currentVal === undefined) {
      return `No data reported for ${clause.subLabel.toLowerCase()} in ${currentYear}.`;
    }

    let trendPhrase = '';
    if (priorVal !== null && priorVal !== undefined && priorVal !== 0) {
      const pctChange = ((currentVal - priorVal) / Math.abs(priorVal)) * 100;
      if (Math.abs(pctChange) >= 0.5) {
        const direction = pctChange > 0 ? 'up' : 'down';
        trendPhrase = `, ${direction} ${Math.abs(pctChange).toFixed(1)}% from ${priorYear}`;
      } else {
        trendPhrase = `, flat versus ${priorYear}`;
      }
    }

    const currentCO2e = clause.byYearCO2e ? clause.byYearCO2e[currentYear] : null;
    const co2ePhrase = (currentCO2e !== null && currentCO2e !== undefined)
      ? ` (${formatValue(currentCO2e, 'kg CO2e')})`
      : '';

    return `${clause.subLabel} ${verb} ${formatValue(currentVal, clause.unit_of_measure)} in ${currentYear}${co2ePhrase}${trendPhrase}.`;
  };

  const generatePreview = async (e) => {
    e.preventDefault();
    if (isGeneratingPreview) return;
    setIsGeneratingPreview(true);
    setError(null);
    setReportData(null);

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (isGSE) {
        // FIX: GSE's own manual wants material topic narratives, real KPI
        // values, and a multi-year comparison — none of which the generic
        // gap-analysis endpoint can provide (it only returns total_co2e,
        // which is NULL for 12 of GSE's 14 clauses since they're non-GHG
        // metrics). Pulls three years via the new /api/reports/gse-disclosure
        // endpoint instead, then groups by the manual's own topic structure
        // (parsed directly from each clause's "Topic: Sub-metric" description).
        const years = [Number(year) - 2, Number(year) - 1, Number(year)];
        const [orgRes, ...yearResults] = await Promise.all([
          axios.get('/api/organizations', config),
          ...years.map(y => axios.get(`/api/reports/gse-disclosure?year=${y}`, config))
        ]);

        const clauseMap = {};
        years.forEach((y, idx) => {
          yearResults[idx].data.forEach(row => {
            if (!clauseMap[row.framework_code]) {
              const hasColon = row.description.includes(':');
              const topic = hasColon ? row.description.split(':')[0].trim() : row.description.trim();
              const subLabel = hasColon ? row.description.split(':').slice(1).join(':').trim() : row.description.trim();
              clauseMap[row.framework_code] = {
                framework_code: row.framework_code,
                topic, subLabel,
                unit_of_measure: row.unit_of_measure,
                aggregation_type: row.aggregation_type,
                byYear: {},
                byYearCO2e: {}
              };
            }
            clauseMap[row.framework_code].byYear[y] = row.reported_value !== null ? Number(row.reported_value) : null;
            clauseMap[row.framework_code].byYearCO2e[y] = row.co2e_value !== null ? Number(row.co2e_value) : null;
          });
        });

        const allClauses = Object.values(clauseMap);
        const topicGroups = {};
        allClauses.forEach(clause => {
          if (!topicGroups[clause.topic]) topicGroups[clause.topic] = [];
          topicGroups[clause.topic].push(clause);
        });

        const fulfilledCount = allClauses.filter(c => c.byYear[Number(year)] !== null && c.byYear[Number(year)] !== undefined).length;
        const complianceScore = allClauses.length === 0 ? 0 : Math.round((fulfilledCount / allClauses.length) * 100);

        setReportData({
          isGSE: true,
          year, framework, generatedAt: new Date().toLocaleDateString(),
          facilityCount: orgRes.data.length,
          years, topicGroups,
          totalClauses: allClauses.length, fulfilledCount, complianceScore
        });

      } else {
        const encodedFramework = encodeURIComponent(framework);
        const encodedYear = encodeURIComponent(year);

        const [orgRes, emissionsRes, obsRes, gapRes] = await Promise.all([
          axios.get('/api/organizations', config),
          axios.get('/api/emissions', config),
          axios.get('/api/observations', config),
          axios.get(`/api/reports/gap-analysis?framework=${encodedFramework}&year=${encodedYear}`, config)
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

        const esgMetrics = { Environmental: [], Social: [], Governance: [], Financial: [] };
        targetObs.forEach(o => {
          const metricObj = {
            name: o.metric_name, value: o.numeric_value !== null ? o.numeric_value : o.text_value,
            unit: o.unit_of_measure, org: o.organization_name
          };
          if (o.pillar === 'E') esgMetrics.Environmental.push(metricObj);
          if (o.pillar === 'S') esgMetrics.Social.push(metricObj);
          if (o.pillar === 'G') esgMetrics.Governance.push(metricObj);
          if (o.pillar === 'F') esgMetrics.Financial.push(metricObj);
        });

        const mappedResults = gapRes.data;
        const totalReqs = mappedResults.length;
        const fulfilledReqs = mappedResults.filter(r => r.is_fulfilled).length;
        const complianceScore = totalReqs === 0 ? 0 : Math.round((fulfilledReqs / totalReqs) * 100);

        setReportData({
          isGSE: false,
          year, framework, generatedAt: new Date().toLocaleDateString(),
          facilityCount: orgRes.data.length, totalCarbon, scopeData, esgMetrics,
          mappedResults, complianceScore
        });
      }

    } catch (err) {
      console.error("Preview Generation Error:", err);
      setError("Failed to compile report data — one or more data sources could not be reached. Please try again before relying on this report.");
      setReportData(null);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const exportOfficialPDF = async () => {
    if (isExportingPDF) return;
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
      pdf.save(`ESG_Radar_${framework.replace(/[/ ]/g, '_')}_Disclosure_${year}.pdf`);

      element.style.boxShadow = originalBoxShadow;
      element.style.border = '1px solid #e5e7eb';
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Failed to export document. Please try again.");
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
              {/* FIX: only frameworks with real seeded clauses in
                  Framework_Mappings are listed. Add new options here only
                  once their clauses have actually been inserted into the
                  database — otherwise this dropdown silently produces
                  empty, misleading reports again. */}
              <option value="Bank of Ghana Sustainable Banking Principles">Bank of Ghana Sustainable Banking Principles</option>
              <option value="NIC Insurance Guidelines">NIC Insurance Guidelines</option>
              <option value={GSE_FRAMEWORK}>GSE ESG Disclosures Guidance Manual</option>
            </select>
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>Reporting Year{isGSE ? ' (latest of 3)' : ''}</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} style={inputStyle}>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', flex: '1 1 300px' }}>
            {/* FIX: the raw CSV export is driven by gap-analysis, which can't
                represent GSE's real KPI values (see note above) — hidden for
                GSE rather than exporting a file that looks broken. */}
            {!isGSE && (
              <button type="button" onClick={handleDownloadCSV} disabled={isGeneratingCSV} style={{...secondaryButtonStyle, opacity: isGeneratingCSV ? 0.7 : 1, cursor: isGeneratingCSV ? 'not-allowed' : 'pointer'}}>
                {isGeneratingCSV ? 'Compiling...' : '📥 Raw CSV'}
              </button>
            )}

            <button type="submit" disabled={isGeneratingPreview} style={{...primaryButtonStyle, opacity: isGeneratingPreview ? 0.7 : 1, cursor: isGeneratingPreview ? 'not-allowed' : 'pointer'}}>
              {isGeneratingPreview ? 'Rendering...' : '📄 Build Visual Report'}
            </button>
          </div>
        </form>
        {error && <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginTop: '20px', fontSize: '14px', border: '1px solid #fecaca' }}>⚠️ {error}</div>}
      </div>

      {reportData && (
        <div style={{ position: 'relative', padding: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <button onClick={exportOfficialPDF} disabled={isExportingPDF} style={{...primaryButtonStyle, backgroundColor: '#dc2626', padding: '10px 24px', opacity: isExportingPDF ? 0.7 : 1, cursor: isExportingPDF ? 'not-allowed' : 'pointer'}}>
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
                <p style={{ margin: 0 }}><strong>Fiscal Year:</strong> {reportData.year}{reportData.isGSE ? ` (${reportData.years[0]}–${reportData.years[2]} shown)` : ''}</p>
                <p style={{ margin: 0 }}><strong>Generated:</strong> {reportData.generatedAt}</p>
                <p style={{ margin: 0 }}><strong>Scope:</strong> {reportData.facilityCount} Verified Facilities</p>
              </div>
            </div>

            <div style={{ marginBottom: '48px', padding: '24px', backgroundColor: reportData.complianceScore === 100 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${reportData.complianceScore === 100 ? '#a7f3d0' : '#fecaca'}`, borderRadius: '8px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#111827', textTransform: 'uppercase', fontWeight: '700' }}>
                      {reportData.isGSE ? `Material Topics Reported (${reportData.fulfilledCount}/${reportData.totalClauses})` : 'Automated Framework Mapping'}
                    </h3>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: reportData.complianceScore === 100 ? '#059669' : '#dc2626' }}>
                        {reportData.complianceScore}% Compliant
                    </div>
                </div>

                {!reportData.isGSE && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '16px' }}>
                    <tbody>
                        {reportData.mappedResults.length === 0 ? (
                            <tr><td style={{ padding: '12px 0', color: '#6b7280' }}>No mapped requirements found for this framework.</td></tr>
                        ) : reportData.mappedResults.map((req, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px 0', width: '30px' }}>
                                    {req.is_fulfilled ? '✅' : '❌'}
                                </td>
                                <td style={{ padding: '12px 0', fontWeight: '700', color: '#374151', width: '120px' }}>
                                    {req.framework_code}
                                </td>
                                <td style={{ padding: '12px 0', color: '#4b5563' }}>
                                    {req.description}
                                </td>
                                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '600', color: req.is_fulfilled ? '#059669' : '#dc2626' }}>
                                    {req.is_fulfilled ? `${Number(req.total_co2e).toLocaleString()} tCO2e` : 'Missing'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
                )}
            </div>

            {reportData.isGSE ? (
              <div style={{ marginBottom: '48px' }}>
                <h3 style={sectionHeaderStyle}>Material Topic Disclosures</h3>
                {Object.entries(reportData.topicGroups).map(([topic, clauses]) => (
                  <div key={topic} style={{ marginBottom: '36px' }}>
                    <h4 style={{ fontSize: '17px', margin: '0 0 14px 0', color: '#111827', fontFamily: 'system-ui, sans-serif', fontWeight: '700' }}>{topic}</h4>
                    {clauses.map(clause => (
                      <div key={clause.framework_code} style={{ marginBottom: '18px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#374151', lineHeight: '1.6', fontFamily: 'system-ui, sans-serif' }}>
                          {buildNarrative(clause, reportData.years)}
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'system-ui, sans-serif' }}>
                          <thead>
                            <tr style={{ background: '#f9fafb' }}>
                              <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{clause.subLabel}</th>
                              {reportData.years.map(y => (
                                <th key={y} style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{y}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: '6px 10px', color: '#9ca3af', fontSize: '11px' }}>{clause.framework_code}</td>
                              {reportData.years.map(y => (
                                <td key={y} style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: clause.byYear[y] != null ? '#111827' : '#9ca3af' }}>
                                  {clause.byYear[y] != null ? formatValue(clause.byYear[y], clause.unit_of_measure) : '—'}
                                </td>
                              ))}
                            </tr>
                            {clause.byYearCO2e && reportData.years.some(y => clause.byYearCO2e[y] != null) && (
                              <tr style={{ borderTop: '1px dashed #e5e7eb' }}>
                                <td style={{ padding: '6px 10px', color: '#9ca3af', fontSize: '11px', fontStyle: 'italic' }}>CO2e equivalent</td>
                                {reportData.years.map(y => (
                                  <td key={y} style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: clause.byYearCO2e[y] != null ? '#4b5563' : '#9ca3af' }}>
                                    {clause.byYearCO2e[y] != null ? formatValue(clause.byYearCO2e[y], 'kg') : '—'}
                                  </td>
                                ))}
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <>
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

                <div style={{ marginBottom: '48px' }}>
                  <h3 style={sectionHeaderStyle}>3. Financial Disclosures</h3>
                  <div>
                    {reportData.esgMetrics.Financial.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: '#9ca3af', fontSize: '14px', margin: 0 }}>No approved disclosures recorded for this period.</p>
                    ) : (
                      <ul style={{ paddingLeft: '24px', margin: 0, lineHeight: '1.8', color: '#374151', fontSize: '15px' }}>
                        {reportData.esgMetrics.Financial.map((metric, idx) => (
                          <li key={idx} style={{ marginBottom: '8px' }}>
                            <strong style={{ color: '#111827' }}>{metric.name}:</strong> {metric.value} {metric.unit}
                            <span style={{ color: '#6b7280', fontSize: '13px', marginLeft: '8px', fontFamily: 'system-ui, sans-serif' }}>(Reported by: {metric.org})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}

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

const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', backgroundColor: '#f9fafb', boxSizing: 'border-box', outline: 'none', color: '#111827', fontWeight: '500' };
const primaryButtonStyle = { flex: 2, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#111827', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: 'background-color 0.2s' };
const secondaryButtonStyle = { flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', color: '#374151', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background-color 0.2s' };
const sectionHeaderStyle = { textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.1em', borderBottom: '1px solid #d1d5db', paddingBottom: '8px', marginBottom: '24px', color: '#4b5563', fontFamily: 'system-ui, sans-serif', fontWeight: '700' };

export default ReportGenerator;
