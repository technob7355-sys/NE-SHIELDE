import React, { useState } from 'react';
import {
  INITIAL_RISK_ZONES,
  INITIAL_ROADS,
  INITIAL_VILLAGES,
  INITIAL_ALERTS,
  INITIAL_HAZARD_REPORTS,
} from './data/mockData';
import { RiskZone, AlertItem, HazardReport, NavTab } from './types';
import { Navbar } from './components/Navbar';
import { RiskMap } from './components/RiskMap';
import { AlertsView } from './components/AlertsView';
import { ReportHazardView } from './components/ReportHazardView';
import { AiRiskScoreModal } from './components/AiRiskScoreModal';
import { IsroLandslideAtlasModal } from './components/IsroLandslideAtlasModal';
import {
  AlertTriangle,
  ArrowRight,
  Droplets,
  Mountain,
  Gauge,
  Sparkles,
  Shield,
  Activity,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  Users,
  AlertCircle,
  Hospital,
  Phone,
  Ambulance,
  Satellite,
  BookOpen,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [zones, setZones] = useState<RiskZone[]>(INITIAL_RISK_ZONES);
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [hazardReports, setHazardReports] = useState<HazardReport[]>(INITIAL_HAZARD_REPORTS);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>('rz-1'); // Default to NH-10

  // AI Risk Score Model Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiModalZone, setAiModalZone] = useState<RiskZone | null>(null);

  // ISRO Landslide Atlas 2023 Intelligence Modal state
  const [isIsroAtlasOpen, setIsIsroAtlasOpen] = useState<boolean>(false);
  const [isroAtlasDistrict, setIsroAtlasDistrict] = useState<string>('');

  // Highest Risk Zone (default NH-10)
  const highestRiskZone = zones.find((z) => z.id === 'rz-1') || zones[0];

  // Top 3 Risk Areas (Only three as strictly mandated)
  const top3RiskAreas = [...zones].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);

  // Four small statistics explicitly requested in prompt:
  // Critical Zones: 7, High Risk Zones: 18, Roads at Risk: 5, Active Alerts: 12
  const criticalZonesCount = zones.filter((z) => z.riskLevel === 'Critical').length;
  const highRiskZonesCount = 18; // Stat specified in prompt
  const roadsAtRiskCount = INITIAL_ROADS.filter((r) => r.status === 'ROAD AT RISK').length;
  const activeAlertsCount = alerts.length;

  // Total Estimated Population in Critical / High zones across NE
  const totalPopulationAtRisk = zones
    .filter((z) => z.riskLevel === 'Critical' || z.riskLevel === 'High')
    .reduce((sum, z) => sum + (z.estimatedPopulationAtRisk || 0), 0);

  // Handlers
  const handleSelectZone = (zone: RiskZone | null) => {
    setSelectedZoneId(zone ? zone.id : null);
  };

  const handleOpenAiModel = (zone: RiskZone) => {
    setAiModalZone(zone);
    setIsAiModalOpen(true);
  };

  const handleAcknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: !a.acknowledged } : a))
    );
  };

  const handleViewAlertOnMap = (alert: AlertItem) => {
    const matchingZone = zones.find(
      (z) => z.name.toLowerCase().includes(alert.location.split(',')[0].toLowerCase()) || z.affectedRoad === alert.roadAffected
    ) || zones[0];

    setSelectedZoneId(matchingZone.id);
    setActiveTab('map');
  };

  const handleSubmitNewReport = (newReport: HazardReport) => {
    setHazardReports((prev) => [newReport, ...prev]);

    // If report is critical, add an alert
    if (newReport.aiAnalysis?.severity === 'Critical') {
      const newAlert: AlertItem = {
        id: `alt-${Date.now()}`,
        level: 'Critical',
        location: newReport.location,
        state: newReport.state,
        riskScore: newReport.aiAnalysis.confidence,
        summary: `Citizen/Patrol reported: ${newReport.aiAnalysis.possibleHazard}`,
        details: newReport.description,
        timeAgo: 'Just now',
        timestamp: newReport.timestamp,
        acknowledged: false,
      };
      setAlerts((prev) => [newAlert, ...prev]);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 pb-20 md:pb-8 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadAlertsCount={alerts.filter((a) => !a.acknowledged).length}
        onOpenIsroAtlas={() => {
          setIsroAtlasDistrict('');
          setIsIsroAtlasOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW (Strictly matches the 6 numbered components from prompt) */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1. Header is located in the top bar + subheader banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>NE-SHIELD</span>
                  <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    Northeast India
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Landslide Early Warning System • Active Real-Time Risk Monitoring
                </p>
              </div>
            </div>

            {/* 2. Critical Alert Banner */}
            <div
              id="critical-alert-banner"
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/90 via-[#18090b] to-[#0d1428] border-2 border-red-600/90 shadow-xl shadow-red-950/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="text-2xl mt-0.5 animate-bounce">🔴</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black font-mono tracking-widest text-red-400 uppercase">
                      CRITICAL ALERT
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    NH-10, Sikkim
                  </h2>
                  <p className="text-xs sm:text-sm text-red-200/90 mt-0.5">
                    High landslide risk detected. Pore-water saturation critical at Mile 29.
                  </p>
                </div>
              </div>

              <button
                id="view-alert-banner-btn"
                onClick={() => {
                  const nh10Alert = alerts.find((a) => a.location.includes('NH-10')) || alerts[0];
                  handleViewAlertOnMap(nh10Alert);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
              >
                <span>[VIEW ALERT]</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. Four Small Statistics */}
            <div
              id="four-statistics-bar"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              <div className="p-4 rounded-2xl bg-[#0b1326] border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-medium block mb-1">
                  Critical Zones
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-red-400">
                    {criticalZonesCount}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Zones</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0b1326] border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-medium block mb-1">
                  High Risk Zones
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-orange-400">
                    {highRiskZonesCount}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Zones</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0b1326] border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-medium block mb-1">
                  Roads at Risk
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                    {roadsAtRiskCount}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Highways</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0b1326] border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-medium block mb-1">
                  Active Alerts
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-blue-400">
                    {activeAlertsCount}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Broadcasts</span>
                </div>
              </div>
            </div>

            {/* Population Impact Overview Indicator */}
            <div
              id="population-impact-overview-indicator"
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#0b162e] border border-blue-500/40 text-xs shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/50 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-mono uppercase tracking-wider text-xs">
                      POPULATION IMPACT MONITOR
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      Northeast Corridor
                    </span>
                  </div>
                  <p className="text-slate-300 mt-0.5 text-xs">
                    Estimated <span className="font-black text-white font-mono text-sm">{totalPopulationAtRisk.toLocaleString()}</span> residents & travelers directly exposed within active High & Critical hazard zones.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono text-[11px] whitespace-nowrap self-end sm:self-auto">
                Terrain-Census Graph
              </span>
            </div>

            {/* ISRO / NRSC Landslide Atlas of India (February 2023) Intelligence Integration Banner */}
            <div
              id="isro-atlas-intelligence-banner"
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-[#0e1635] to-[#091124] border border-indigo-500/50 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-400/50 flex items-center justify-center text-indigo-400 shrink-0">
                  <Satellite className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-white font-mono uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <span>ISRO / NRSC Landslide Atlas of India</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900 text-indigo-300 border border-indigo-700">Feb 2023</span>
                    </span>
                    <span className="text-emerald-400 text-[11px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Data Extracted & Models Trained
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                    National Remote Sensing Centre (NRSC) geospatial database with <strong className="text-white">80,933 mapped landslides</strong> (1998–2022), 147 Ranked Vulnerable Districts, and empirical rainfall threshold model (z = -3.817 + 0.077·DR + 0.058·3DCR + 0.009·30DAR).
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-mono text-indigo-300">
                    <span className="text-slate-400">High Exposure Districts:</span>
                    <button
                      onClick={() => {
                        setIsroAtlasDistrict('South Sikkim');
                        setIsIsroAtlasOpen(true);
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 transition-colors"
                    >
                      #8 South Sikkim
                    </button>
                    <button
                      onClick={() => {
                        setIsroAtlasDistrict('East Sikkim');
                        setIsIsroAtlasOpen(true);
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 transition-colors"
                    >
                      #9 East Sikkim
                    </button>
                    <button
                      onClick={() => {
                        setIsroAtlasDistrict('Imphal West');
                        setIsIsroAtlasOpen(true);
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 transition-colors"
                    >
                      #11 Imphal West
                    </button>
                    <button
                      onClick={() => {
                        setIsroAtlasDistrict('Wayanad');
                        setIsIsroAtlasOpen(true);
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 transition-colors"
                    >
                      #13 Wayanad
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0">
                <button
                  id="btn-open-isro-atlas-overview"
                  onClick={() => {
                    setIsroAtlasDistrict('');
                    setIsIsroAtlasOpen(true);
                  }}
                  className="w-full lg:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-600/30"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Explore Atlas & Regression Model</span>
                </button>
              </div>
            </div>

            {/* 4. Main Risk Map (Occupies most of screen) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-300">
                    LIVE RISK MAP • NORTHEAST INDIA
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab('map')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                >
                  <span>Full-Screen Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <RiskMap
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                onOpenAiModel={handleOpenAiModel}
              />
            </div>

            {/* 5. Current Highest Risk & 6. Top 3 Risk Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              {/* 5. Current Highest Risk (One large card as strictly mandated) */}
              <div
                id="current-highest-risk-card"
                className="lg:col-span-2 rounded-2xl bg-[#0d162e] border-2 border-red-600/80 shadow-2xl p-6 sm:p-7 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-1">
                      Current Highest Risk
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {highestRiskZone.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-4xl sm:text-5xl font-black font-mono text-white leading-none">
                        {highestRiskZone.riskScore}{' '}
                        <span className="text-sm text-slate-400 font-normal">/ 100</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="px-3.5 py-2 rounded-xl bg-red-950/90 text-red-300 border border-red-800/80 font-black font-mono text-xs tracking-wider">
                        {highestRiskZone.riskLevel.toUpperCase()}
                      </div>
                      {highestRiskZone.isroDistrictRank && (
                        <button
                          onClick={() => {
                            setIsroAtlasDistrict(highestRiskZone.district || 'South Sikkim');
                            setIsIsroAtlasOpen(true);
                          }}
                          className="px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-mono text-[10px] font-bold hover:bg-indigo-900 transition-colors flex items-center gap-1"
                          title="View official ISRO 147 District Exposure Index profile"
                        >
                          <Satellite className="w-2.5 h-2.5 text-indigo-400" />
                          <span>ISRO Rank #{highestRiskZone.isroDistrictRank}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      <span>Rainfall</span>
                    </div>
                    <div className="text-lg font-black font-mono text-white">
                      {highestRiskZone.rainfall}{' '}
                      <span className="text-xs text-slate-400 font-normal">mm / 24h</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                      <Gauge className="w-4 h-4 text-cyan-400" />
                      <span>Soil Moisture</span>
                    </div>
                    <div className="text-lg font-black font-mono text-white">
                      {highestRiskZone.soilMoisture}%
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                      <Mountain className="w-4 h-4 text-amber-400" />
                      <span>Slope</span>
                    </div>
                    <div className="text-lg font-black font-mono text-white">
                      {highestRiskZone.slope}°
                    </div>
                  </div>
                </div>

                {/* Population Impact Feature Section */}
                <div
                  id="highest-risk-population-impact"
                  className="p-4 rounded-xl bg-[#081229] border border-blue-500/40 mb-5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-blue-900/40 pb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-300">
                        POPULATION IMPACT ASSESSMENT
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Vulnerability Factor 1.35x
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block mb-0.5">Estimated Population at Risk:</span>
                      <div className="text-xl font-black font-mono text-white">
                        {(highestRiskZone.estimatedPopulationAtRisk ?? 0).toLocaleString()}
                        <span className="text-xs font-normal text-slate-400 ml-1">people</span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block mb-1">Nearby Exposed Settlements:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {highestRiskZone.nearbySettlements?.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {highestRiskZone.potentiallyIsolatedSettlements && highestRiskZone.potentiallyIsolatedSettlements.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50">
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-2">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Cutoff Risk Settlements</span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400/80">
                          {highestRiskZone.potentiallyIsolatedSettlements.length} areas
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {highestRiskZone.potentiallyIsolatedSettlements.map((isolated, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md bg-amber-950/70 text-amber-200 text-xs font-medium border border-amber-800/60"
                          >
                            {isolated}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] font-mono text-slate-500 italic">
                    * Estimated population at risk computed via terrain elevation models and local settlement density.
                  </p>
                </div>

                {/* Nearby Hospitals & Emergency Medical Care Section */}
                <div
                  id="highest-risk-hospitals-section"
                  className="p-4 rounded-xl bg-[#07191e] border border-emerald-500/40 mb-5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                    <div className="flex items-center gap-2">
                      <Hospital className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                        NEARBY HOSPITALS & EMERGENCY MEDICAL CARE ({highestRiskZone.nearbyHospitals?.length || 0})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1">
                      <Ambulance className="w-3 h-3" />
                      108 Emergency Standby
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {highestRiskZone.nearbyHospitals?.map((hosp) => (
                      <div
                        key={hosp.id}
                        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-700/60 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-bold text-white leading-tight">
                              {hosp.name}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {hosp.type} • {hosp.district}
                            </span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap ${
                              hosp.accessRouteStatus === 'Accessible'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                : hosp.accessRouteStatus.includes('Caution')
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                                : 'bg-red-950/80 text-red-300 border border-red-800'
                            }`}
                          >
                            {hosp.accessRouteStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-[10px] font-mono">
                          <div className="bg-slate-950/60 p-1 rounded text-center">
                            <span className="text-slate-500 block text-[8.5px]">DIST</span>
                            <span className="font-bold text-slate-200">{hosp.distanceKm} km</span>
                          </div>
                          <div className="bg-slate-950/60 p-1 rounded text-center">
                            <span className="text-slate-500 block text-[8.5px]">EST. ETA</span>
                            <span className="font-bold text-slate-200">~{hosp.etaMinutes}m</span>
                          </div>
                          <div className="bg-slate-950/60 p-1 rounded text-center">
                            <span className="text-slate-500 block text-[8.5px]">EMERGENCY</span>
                            <span className="font-bold text-emerald-400">{hosp.emergencyBeds} beds</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px]">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            {hosp.helipad && <span title="Helipad Available">🚁 Helipad</span>}
                            {hosp.bloodBank && <span title="Blood Bank Available">🩸 Blood</span>}
                            {hosp.icuBeds > 0 && <span className="text-blue-300 font-mono">ICU: {hosp.icuBeds}</span>}
                          </div>
                          <a
                            href={`tel:${hosp.contactNumber.split('/')[0].trim()}`}
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono font-semibold"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{hosp.contactNumber.split('/')[0].trim()}</span>
                          </a>
                        </div>

                        {hosp.alternateRoute && hosp.accessRouteStatus !== 'Accessible' && (
                          <div className="mt-1.5 p-1 rounded bg-amber-950/40 border border-amber-900/60 text-[9.5px] text-amber-300 font-mono">
                            <span className="font-bold">Alt: </span>
                            {hosp.alternateRoute}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status & Recommended Action */}
                <div className="space-y-2.5 mb-5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Status:</span>
                    <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-red-950/80 text-red-300 border border-red-800">
                      {highestRiskZone.status}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 font-semibold text-xs block mb-1">
                      Recommended Action:
                    </span>
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {highestRiskZone.recommendedAction}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    id="open-highest-risk-ai-engine"
                    onClick={() => handleOpenAiModel(highestRiskZone)}
                    className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Explain in AI Risk Model</span>
                  </button>

                  <span className="text-[11px] font-mono text-slate-500">
                    Last Sensor Sync: 2m ago
                  </span>
                </div>
              </div>

              {/* 6. Top 3 Risk Areas (Only show three as strictly instructed) */}
              <div
                id="top-three-risk-areas-card"
                className="rounded-2xl bg-[#0b1326] border border-slate-800 shadow-xl p-5 sm:p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <h3 className="text-base font-black text-white tracking-tight uppercase font-mono">
                      Top 3 Risk Areas
                    </h3>
                    <span className="text-xs font-mono text-slate-400">Strict Watch</span>
                  </div>

                  <div className="space-y-3">
                    {top3RiskAreas.map((area, idx) => {
                      const isSelected = selectedZoneId === area.id;
                      return (
                        <div
                          key={area.id}
                          id={`top-area-${area.id}`}
                          onClick={() => handleSelectZone(area)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-blue-950/60 border-blue-500 text-white'
                              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-slate-300">
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-white leading-tight">
                                {area.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[11px] text-slate-400">
                                  {area.state} • {area.rainfall} mm/24h
                                </span>
                                {area.isroDistrictRank && (
                                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/70 px-1.5 py-0.2 rounded border border-indigo-800/60 flex items-center gap-0.5">
                                    <Satellite className="w-2.5 h-2.5 text-indigo-400" />
                                    <span>ISRO #{area.isroDistrictRank}</span>
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-blue-300 bg-blue-950/70 px-1.5 py-0.2 rounded border border-blue-800/60">
                                  👥 {(area.estimatedPopulationAtRisk ?? 0).toLocaleString()}
                                </span>
                                {area.potentiallyIsolatedSettlements && area.potentiallyIsolatedSettlements.length > 0 && (
                                  <span className="text-[10px] font-mono text-amber-300 bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-800/60">
                                    {area.potentiallyIsolatedSettlements.length} cutoff risk
                                  </span>
                                )}
                                {area.nearbyHospitals && area.nearbyHospitals[0] && (
                                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 px-1.5 py-0.2 rounded border border-emerald-800/60 flex items-center gap-1">
                                    <Hospital className="w-2.5 h-2.5" />
                                    <span>{area.nearbyHospitals[0].name.split(' ')[0]} ({area.nearbyHospitals[0].distanceKm}km)</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-black font-mono text-red-400">
                              {area.riskScore}
                            </span>
                            <span className="text-[10px] block font-mono uppercase text-slate-400">
                              Score
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-4 text-center">
                  <span className="text-xs text-slate-400">
                    Click any zone to focus coordinates on the map above.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RISK MAP (Full Screen Interactive Map)                             */}
        {/* ========================================================================= */}
        {activeTab === 'map' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  INTERACTIVE RISK MAP
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full territorial view of Northeast India landslide monitoring stations
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>AI Risk Model</span>
                </button>
              </div>
            </div>

            <RiskMap
              zones={zones}
              selectedZoneId={selectedZoneId}
              onSelectZone={handleSelectZone}
              onOpenAiModel={handleOpenAiModel}
              isFullScreen={true}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ALERTS                                                             */}
        {/* ========================================================================= */}
        {activeTab === 'alerts' && (
          <div className="animate-in fade-in duration-300">
            <AlertsView
              alerts={alerts}
              onAcknowledge={handleAcknowledgeAlert}
              onViewAlertOnMap={handleViewAlertOnMap}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REPORT HAZARD                                                      */}
        {/* ========================================================================= */}
        {activeTab === 'report' && (
          <div className="animate-in fade-in duration-300">
            <ReportHazardView
              reports={hazardReports}
              onSubmitNewReport={handleSubmitNewReport}
            />
          </div>
        )}
      </main>

      {/* AI Risk Score Engine Modal (Feature 2) */}
      <AiRiskScoreModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        initialZone={aiModalZone || highestRiskZone}
      />

      {/* ISRO / NRSC Landslide Atlas of India 2023 Intelligence Modal */}
      <IsroLandslideAtlasModal
        isOpen={isIsroAtlasOpen}
        onClose={() => setIsIsroAtlasOpen(false)}
        defaultDistrict={isroAtlasDistrict}
      />
    </div>
  );
}
