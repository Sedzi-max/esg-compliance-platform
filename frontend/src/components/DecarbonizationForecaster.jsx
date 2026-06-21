import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

function DecarbonizationForecaster() {
    const [sector, setSector] = useState('manufacturing'); // Defaulting for demonstration
    const [availableInitiatives, setAvailableInitiatives] = useState([]);
    const [activeInitiatives, setActiveInitiatives] = useState({}); // Stores { id: boolean }
    const [loading, setLoading] = useState(true);

    // Fetch dynamic levers when the sector changes
    useEffect(() => {
        const fetchInitiatives = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`/api/initiatives?sector=${sector}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                setAvailableInitiatives(response.data);
                
                // Reset all toggles to "off" when switching sectors
                const resetToggles = {};
                response.data.forEach(init => resetToggles[init.id] = false);
                setActiveInitiatives(resetToggles);
            } catch (err) {
                console.error("Error fetching initiatives:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitiatives();
    }, [sector]);

    const handleToggle = (id) => {
        setActiveInitiatives(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- DYNAMIC FORECASTING MATH ENGINE ---
    const chartData = useMemo(() => {
        const baseYear = new Date().getFullYear();
        const targetYear = baseYear + 10; 
        const baselineEmissions = 500000; // e.g., 500k kg CO2e

        // SBTi Target: 90% absolute reduction over 10 years
        const sbtiTargetEmissions = baselineEmissions * 0.10; 
        const annualTargetDrop = (baselineEmissions - sbtiTargetEmissions) / (targetYear - baseYear);

        let data = [];

        for (let year = baseYear; year <= targetYear; year++) {
            const step = year - baseYear;
            
            // 1. Business As Usual (BAU) - 2% natural growth
            const bau = baselineEmissions * Math.pow(1.02, step);

            // 2. The Science-Based Target Trajectory
            const target = baselineEmissions - (annualTargetDrop * step);

            // 3. Projected Reality (Dynamically calculated from API data)
            let projectedReduction = 0;

            // Loop through all active toggles and apply their specific database math
            Object.keys(activeInitiatives).forEach(id => {
                if (activeInitiatives[id]) {
                    const initiativeData = availableInitiatives.find(i => i.id === parseInt(id));
                    if (initiativeData && step > 0) {
                        // Calculate how much of the initiative has "phased in"
                        const phaseInRatio = Math.min(step / initiativeData.phase_in_years, 1);
                        projectedReduction += (baselineEmissions * Number(initiativeData.impact_percentage)) * phaseInRatio;
                    }
                }
            });

            const projected = Math.max(bau - projectedReduction, 0);

            data.push({
                year: year.toString(),
                "Business as Usual": Math.round(bau),
                "Target Trajectory": Math.round(target),
                "Projected Emissions": Math.round(projected)
            });
        }
        return data;
    }, [activeInitiatives, availableInitiatives]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'white', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <p style={{ margin: '0 0 12px 0', fontWeight: '800', color: '#111827' }}>Year: {label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ margin: '0 0 6px 0', color: entry.color, fontWeight: '600', fontSize: '14px' }}>
                            {entry.name}: {entry.value.toLocaleString()} kg CO2e
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🔭 Net-Zero Scenario Modeler
                    </h2>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '15px', maxWidth: '600px' }}>
                        Toggle strategic operational initiatives below to forecast their impact on your Science-Based Target (SBTi) trajectory.
                    </p>
                </div>

                {/* For testing, letting you switch the sector dynamically */}
                <select 
                    value={sector} 
                    onChange={(e) => setSector(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="manufacturing">Sector: Manufacturing</option>
                    <option value="logistics">Sector: Logistics</option>
                    <option value="real_estate">Sector: Real Estate</option>
                    <option value="banking">Sector: Banking & Finance</option>
                </select>
            </div>

            {/* FIX: Forced 2fr 1fr strict grid layout so they stay side-by-side */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'start' }}>
                
                {/* Left Side: The Interactive Chart */}
                <div style={{ width: '100%', height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="year" tick={{fill: '#6b7280', fontSize: 12}} axisLine={{stroke: '#d1d5db'}} tickLine={false} />
                            <YAxis tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />

                            <Line type="monotone" name="Business as Usual" dataKey="Business as Usual" stroke="#d1d5db" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                            <Line type="monotone" name="Target Trajectory" dataKey="Target Trajectory" stroke="#10b981" strokeWidth={3} dot={false} />
                            <Area type="monotone" name="Projected Emissions" dataKey="Projected Emissions" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={4} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Right Side: Dynamic API Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: '700', letterSpacing: '0.05em' }}>
                        Industry Specific Levers
                    </h3>

                    {loading ? (
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading sector logic...</p>
                    ) : (
                        availableInitiatives.map((init) => (
                            <ToggleCard 
                                key={init.id}
                                title={init.title} 
                                description={init.description} 
                                isActive={!!activeInitiatives[init.id]} 
                                onClick={() => handleToggle(init.id)} 
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper Component for the beautifully styled toggle buttons
function ToggleCard({ title, description, isActive, onClick }) {
    return (
        <div 
            onClick={onClick}
            style={{ 
                padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '16px', alignItems: 'center',
                backgroundColor: isActive ? '#eff6ff' : 'white',
                border: isActive ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                boxShadow: isActive ? '0 4px 6px -1px rgba(59, 130, 246, 0.1)' : '0 1px 2px rgba(0,0,0,0.05)'
            }}
        >
            <div style={{ width: '44px', height: '24px', backgroundColor: isActive ? '#3b82f6' : '#d1d5db', borderRadius: '12px', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: isActive ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
            </div>
            
            <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: isActive ? '#1e40af' : '#111827' }}>{title}</h4>
                <p style={{ margin: 0, fontSize: '13px', color: isActive ? '#1e3a8a' : '#6b7280', lineHeight: '1.4' }}>{description}</p>
            </div>
        </div>
    );
}

export default DecarbonizationForecaster;