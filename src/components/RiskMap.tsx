import React, { useState, useMemo } from 'react';
import { RiskZone, RiskLevel, HospitalFacility } from '../types';
import { ALL_REGIONAL_HOSPITALS } from '../data/hospitalsData';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  Droplets,
  Mountain,
  Gauge,
  ArrowRight,
  X,
  Users,
  Home,
  AlertCircle,
  Hospital,
  Phone,
  Ambulance,
  HeartPulse,
} from 'lucide-react';

interface RiskMapProps {
  zones: RiskZone[];
  selectedZoneId: string | null;
  onSelectZone: (zone: RiskZone | null) => void;
  onOpenAiModel?: (zone: RiskZone) => void;
  isFullScreen?: boolean;
}

export const RiskMap: React.FC<RiskMapProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  onOpenAiModel,
  isFullScreen = false,
}) => {
  const [filterLevel, setFilterLevel] = useState<'All' | RiskLevel>('All');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredZone, setHoveredZone] = useState<RiskZone | null>(null);
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [selectedHospital, setSelectedHospital] = useState<HospitalFacility | null>(null);
  const [hoveredHospital, setHoveredHospital] = useState<HospitalFacility | null>(null);

  // Geographic projection: Lng (88.0 to 96.5) -> X (60 to 860), Lat (24.2 to 29.0) -> Y (480 to 60)
  const projectCoordinates = (lat: number, lng: number) => {
    const minLng = 88.0;
    const maxLng = 96.5;
    const minLat = 24.2;
    const maxLat = 29.0;

    const x = ((lng - minLng) / (maxLng - minLng)) * 780 + 70;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 410 + 50;
    return { x, y };
  };

  const filteredZones = useMemo(() => {
    if (filterLevel === 'All') return zones;
    return zones.filter((z) => z.riskLevel === filterLevel);
  }, [zones, filterLevel]);

  const selectedZone = useMemo(() => {
    return zones.find((z) => z.id === selectedZoneId) || null;
  }, [zones, selectedZoneId]);

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'Critical':
        return '#ef4444'; // Red
      case 'High':
        return '#f97316'; // Orange
      case 'Moderate':
        return '#eab308'; // Yellow
      case 'Low':
        return '#22c55e'; // Green
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(Math.max(0.8, prev + delta), 2.5));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    onSelectZone(null);
  };

  return (
    <div
      id="live-risk-map-container"
      className={`relative w-full overflow-hidden rounded-2xl bg-[#09101f] border border-slate-800 shadow-2xl flex flex-col ${
        isFullScreen ? 'h-[calc(100vh-140px)] min-h-[550px]' : 'h-[520px] md:h-[620px]'
      }`}
    >
      {/* Top Map Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Risk Level Filter Chips */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl bg-[#0d1629]/90 backdrop-blur-md border border-slate-700/60 shadow-lg">
          {(['All', 'Critical', 'High', 'Moderate', 'Low'] as const).map((lvl) => {
            const count = lvl === 'All' ? zones.length : zones.filter((z) => z.riskLevel === lvl).length;
            const active = filterLevel === lvl;
            return (
              <button
                key={lvl}
                id={`filter-btn-${lvl.toLowerCase()}`}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {lvl !== 'All' && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getRiskColor(lvl as RiskLevel) }}
                  />
                )}
                <span>{lvl}</span>
                <span className="text-[10px] opacity-70 px-1 py-0.2 rounded bg-black/30 font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hospital Layer Toggle & Zoom Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            id="toggle-hospitals-layer"
            onClick={() => setShowHospitals(!showHospitals)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 backdrop-blur-md border shadow-lg ${
              showHospitals
                ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500/60 shadow-emerald-950/40'
                : 'bg-[#0d1629]/90 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-700/60'
            }`}
            title="Toggle Hospitals & Trauma Centres layer"
          >
            <Hospital className="w-3.5 h-3.5 text-emerald-300" />
            <span>Hospitals</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-black/30 font-mono">
              {ALL_REGIONAL_HOSPITALS.length}
            </span>
          </button>

          {/* Zoom & Pan Controls */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1629]/90 backdrop-blur-md border border-slate-700/60 shadow-lg">
            <button
              id="map-zoom-in"
              onClick={() => handleZoom(0.25)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              id="map-zoom-out"
              onClick={() => handleZoom(-0.25)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              id="map-reset-view"
              onClick={handleResetView}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset map view"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox="0 0 920 540"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          <defs>
            {/* Background Terrain Grid */}
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#17223b" strokeWidth="0.7" opacity="0.4" />
            </pattern>
            {/* Mountain Gradient */}
            <linearGradient id="himalaya-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.1" />
            </linearGradient>
            {/* Pulse filter for critical zones */}
            <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ef4444" floodOpacity="0.8" />
            </filter>
            <filter id="glow-orange" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f97316" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* Background subtle grid */}
          <rect width="920" height="540" fill="url(#grid-pattern)" />

          {/* Topographic Contour Polygons representing Northeast India relief */}
          <g id="terrain-contours" opacity="0.45">
            {/* Himalayan High Crests (Northern Arunachal & Sikkim) */}
            <path
              d="M 70 200 Q 110 160 140 190 Q 200 130 290 120 Q 420 80 580 90 Q 750 110 870 140 L 880 60 L 70 60 Z"
              fill="url(#himalaya-grad)"
              stroke="#334155"
              strokeWidth="1"
            />
            {/* Eastern Himalayas Elevation Iso-lines */}
            <path
              d="M 80 180 Q 120 140 180 160 Q 300 110 460 100 Q 640 100 850 130"
              fill="none"
              stroke="#26344d"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <path
              d="M 90 220 Q 200 170 340 150 Q 520 140 780 170"
              fill="none"
              stroke="#1e2c45"
              strokeWidth="1"
            />

            {/* Meghalaya Shillong Plateau Escarpment */}
            <path
              d="M 230 350 Q 330 330 450 340 Q 470 380 430 410 Q 320 420 220 400 Z"
              fill="#141e33"
              stroke="#2e3e5c"
              strokeWidth="1.2"
            />

            {/* Dima Hasao / Barail Range (Central Assam to Cachar) */}
            <path
              d="M 440 340 Q 510 320 580 340 Q 590 390 530 420 Q 470 410 440 370 Z"
              fill="#131c30"
              stroke="#263650"
              strokeWidth="1"
            />
          </g>

          {/* Regional Borders (Stylized Geo outlines) */}
          <g id="state-outlines" stroke="#25334d" strokeWidth="1.5" fill="none" opacity="0.6">
            {/* Sikkim Wedge */}
            <path d="M 90 140 L 145 150 L 135 240 L 80 230 Z" strokeDasharray="3 3" />
            {/* Meghalaya Outline */}
            <path d="M 220 340 L 460 335 L 450 410 L 210 400 Z" strokeDasharray="3 3" />
            {/* Assam Valley Border Corridor */}
            <path d="M 140 240 Q 260 250 440 250 Q 640 230 840 210 L 850 310 Q 650 330 460 335 L 220 340 L 140 240" />
            {/* Arunachal Northern Arc */}
            <path d="M 290 120 Q 500 80 720 100 Q 860 130 890 210 L 840 210 Q 640 230 440 250 Q 320 200 290 120" />
          </g>

          {/* Water Bodies: Brahmaputra River Network & Teesta */}
          <g id="river-network" stroke="#1d4ed8" strokeOpacity="0.45" fill="none">
            {/* Teesta River (Sikkim into plains) */}
            <path d="M 110 150 Q 120 190 115 250 Q 110 300 112 360" strokeWidth="2" />
            {/* Brahmaputra Main Stem (East to West through Assam Valley) */}
            <path
              d="M 850 180 Q 760 210 680 235 Q 580 250 480 260 Q 360 265 260 280 Q 180 295 130 330"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Tributaries: Subansiri & Barak */}
            <path d="M 640 140 Q 630 190 610 240" strokeWidth="1.5" />
            <path d="M 490 390 Q 520 440 500 480" strokeWidth="2" />
          </g>

          {/* Arterial Highways (High-risk logistics links) */}
          <g id="highways" opacity="0.8">
            {/* NH-10 (Sevoke to Gangtok) */}
            <path
              d="M 100 290 L 108 240 L 115 200 L 125 170"
              stroke="#3b82f6"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="6 3"
            />
            {/* NH-6 (Shillong to Silchar) */}
            <path
              d="M 330 345 L 390 365 L 450 380 L 510 430"
              stroke="#3b82f6"
              strokeWidth="2.2"
              fill="none"
              strokeDasharray="6 3"
            />
            {/* NH-13 (Trans-Arunachal Highway) */}
            <path
              d="M 320 230 L 335 180 L 360 140 L 420 120"
              stroke="#3b82f6"
              strokeWidth="2.2"
              fill="none"
              strokeDasharray="6 3"
            />
            {/* NH-27 (Lumding-Haflong-Silchar) */}
            <path
              d="M 460 265 L 485 320 L 515 375 L 510 430"
              stroke="#3b82f6"
              strokeWidth="2.2"
              fill="none"
              strokeDasharray="6 3"
            />
          </g>

          {/* State & Landmark Subtle Reference Markers (No large text clutter as requested) */}
          <g id="state-subtle-labels" fill="#64748b" fontSize="10" fontWeight="600" opacity="0.6">
            <text x="85" y="130" letterSpacing="1">SIKKIM</text>
            <text x="320" y="380" letterSpacing="1.5">MEGHALAYA</text>
            <text x="490" y="110" letterSpacing="1.5">ARUNACHAL PRADESH</text>
            <text x="460" y="280" letterSpacing="2">ASSAM VALLEY</text>
          </g>

          {/* 20 Risk Zone Markers */}
          <g id="risk-zones-pins">
            {filteredZones.map((zone) => {
              const { x, y } = projectCoordinates(zone.lat, zone.lng);
              const isSelected = selectedZoneId === zone.id;
              const isHovered = hoveredZone?.id === zone.id;
              const color = getRiskColor(zone.riskLevel);
              const isCritical = zone.riskLevel === 'Critical';

              return (
                <g
                  key={zone.id}
                  id={`pin-${zone.id}`}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer transition-transform duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectZone(isSelected ? null : zone);
                  }}
                  onMouseEnter={() => setHoveredZone(zone)}
                  onMouseLeave={() => setHoveredZone(null)}
                >
                  {/* Outer Pulsing Wave for Critical Zones */}
                  {isCritical && (
                    <circle
                      r="18"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.8"
                      className="animate-pulse-ring"
                      opacity="0.8"
                    />
                  )}

                  {/* Selection Indicator Ring */}
                  {isSelected && (
                    <circle
                      r="16"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2.5"
                      strokeDasharray="3 3"
                      className="animate-spin"
                      style={{ animationDuration: '8s' }}
                    />
                  )}

                  {/* Base Circle */}
                  <circle
                    r={isSelected ? 10 : isHovered ? 9 : isCritical ? 8 : 6.5}
                    fill={color}
                    filter={isCritical ? 'url(#glow-red)' : zone.riskLevel === 'High' ? 'url(#glow-orange)' : undefined}
                    stroke="#080d1a"
                    strokeWidth="2"
                    className="transition-all duration-200"
                  />

                  {/* Inner White Core Dot */}
                  <circle r={isSelected ? 3.5 : 2.5} fill="#ffffff" />

                  {/* Score Indicator Badge on Hover or Selection */}
                  {(isHovered || isSelected) && (
                    <g transform="translate(0, -18)" className="pointer-events-none">
                      <rect
                        x="-24"
                        y="-14"
                        width="48"
                        height="18"
                        rx="4"
                        fill="#0b1329"
                        stroke={color}
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="-2"
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="monospace"
                      >
                        {zone.riskScore}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Emergency Hospital & Trauma Center Pins */}
          {showHospitals && (
            <g id="hospital-pins">
              {ALL_REGIONAL_HOSPITALS.map((hosp) => {
                const { x, y } = projectCoordinates(hosp.lat, hosp.lng);
                const isSelected = selectedHospital?.id === hosp.id;
                const isHovered = hoveredHospital?.id === hosp.id;
                const isTrauma = hosp.type.includes('Trauma');

                return (
                  <g
                    key={hosp.id}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHospital(isSelected ? null : hosp);
                    }}
                    onMouseEnter={() => setHoveredHospital(hosp)}
                    onMouseLeave={() => setHoveredHospital(null)}
                  >
                    {/* Pulsing ring for Trauma & Tertiary apex hospitals */}
                    {isTrauma && (
                      <circle
                        r={13}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.2"
                        opacity="0.6"
                      />
                    )}

                    {/* Hospital Pin Background */}
                    <circle
                      r={isHovered || isSelected ? 8.5 : 7}
                      fill={isTrauma ? '#064e3b' : '#042f2e'}
                      stroke={isSelected ? '#38bdf8' : '#34d399'}
                      strokeWidth={isHovered || isSelected ? 2.2 : 1.4}
                      className="transition-all"
                    />

                    {/* Hospital Cross (+) Symbol */}
                    <path
                      d="M -1 -4 L 1 -4 L 1 -1 L 4 -1 L 4 1 L 1 1 L 1 4 L -1 4 L -1 1 L -4 1 L -4 -1 L -1 -1 Z"
                      fill="#ffffff"
                    />

                    {/* Interactive Pin Hover Tag */}
                    {(isHovered || isSelected) && (
                      <g transform="translate(0, -14)" className="pointer-events-none">
                        <rect
                          x="-65"
                          y="-20"
                          width="130"
                          height="18"
                          rx="4"
                          fill="#022c22"
                          stroke="#10b981"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="-7"
                          textAnchor="middle"
                          fill="#a7f3d0"
                          fontSize="8.5"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          🏥 {hosp.name.length > 20 ? hosp.name.slice(0, 18) + '…' : hosp.name}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Map Legend (Clean & Minimalist) */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0d1629]/90 backdrop-blur-md border border-slate-700/60 shadow-lg text-xs">
        <span className="text-slate-400 font-medium">Risk:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
          <span className="text-slate-200">Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-slate-200">High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span className="text-slate-200">Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-slate-200">Low</span>
        </div>
        <div className="h-3 w-[1px] bg-slate-700 mx-0.5" />
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          <span className="text-emerald-300 font-medium">Hospitals ({ALL_REGIONAL_HOSPITALS.length})</span>
        </div>
      </div>

      {/* Selected Zone Side Panel (Clean & Concise as requested) */}
      {selectedZone && (
        <div
          id="zone-side-panel"
          className="absolute bottom-4 right-4 z-30 w-80 sm:w-96 max-h-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-[#0d172e]/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl p-5 text-slate-100 transition-all duration-300"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getRiskColor(selectedZone.riskLevel) }}
                />
                <span className="text-[11px] font-mono tracking-wide uppercase text-slate-400">
                  {selectedZone.state}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono ${
                    selectedZone.riskLevel === 'Critical'
                      ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                      : selectedZone.riskLevel === 'High'
                      ? 'bg-orange-950/80 text-orange-300 border border-orange-800/60'
                      : selectedZone.riskLevel === 'Moderate'
                      ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-800/60'
                      : 'bg-green-950/80 text-green-300 border border-green-800/60'
                  }`}
                >
                  {selectedZone.riskLevel.toUpperCase()}
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                {selectedZone.name}
              </h3>
            </div>
            <button
              id="close-zone-panel-btn"
              onClick={() => onSelectZone(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Risk Score & Key Metrics */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90">
              <span className="text-[11px] text-slate-400 block mb-0.5">Risk Score</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-white">
                  {selectedZone.riskScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 100</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span>Rainfall</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-100">
                {selectedZone.rainfall}{' '}
                <span className="text-xs font-normal text-slate-400">mm/24h</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>Soil Moisture</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-100">
                {selectedZone.soilMoisture}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
                <Mountain className="w-3.5 h-3.5 text-amber-400" />
                <span>Slope</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-100">
                {selectedZone.slope}°
              </div>
            </div>
          </div>

          {/* Population Impact Feature Section */}
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-300 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>POPULATION IMPACT</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Est. Raster Model
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <span className="text-xs text-slate-300">Population at Risk:</span>
              <span className="text-lg font-black font-mono text-white">
                {(selectedZone.estimatedPopulationAtRisk ?? 0).toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1">people</span>
              </span>
            </div>

            {/* Nearby Settlements */}
            {selectedZone.nearbySettlements && selectedZone.nearbySettlements.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] text-slate-400 block mb-1">Nearby Settlements:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedZone.nearbySettlements.map((settlement, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700/80 text-[10px] text-slate-300 font-medium"
                    >
                      {settlement}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cutoff Settlements Risk */}
            {selectedZone.potentiallyIsolatedSettlements && selectedZone.potentiallyIsolatedSettlements.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Cutoff Risk Settlements</span>
                  </div>
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    {selectedZone.potentiallyIsolatedSettlements.length} areas
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedZone.potentiallyIsolatedSettlements.map((settlement, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-md bg-amber-950/60 border border-amber-800/70 text-[10px] text-amber-200 font-medium tracking-wide"
                    >
                      {settlement}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Emergency Hospitals & Trauma Care Section */}
          <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-800/60 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
                <Hospital className="w-3.5 h-3.5 text-emerald-400" />
                <span>NEARBY HOSPITALS & TRAUMA ({selectedZone.nearbyHospitals?.length || 0})</span>
              </div>
              <span className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1">
                <Ambulance className="w-3 h-3 inline" /> 108 Dispatch
              </span>
            </div>

            <div className="space-y-2 pt-0.5">
              {selectedZone.nearbyHospitals && selectedZone.nearbyHospitals.length > 0 ? (
                selectedZone.nearbyHospitals.map((hosp) => (
                  <div
                    key={hosp.id}
                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-emerald-700/60 transition-colors"
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
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                            : hosp.accessRouteStatus.includes('Caution')
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                            : 'bg-red-950/80 text-red-300 border border-red-800/80'
                        }`}
                      >
                        {hosp.accessRouteStatus === 'Accessible'
                          ? '✓ Open'
                          : hosp.accessRouteStatus.includes('Caution')
                          ? '⚠️ Caution'
                          : '⛔ Impaired'}
                      </span>
                    </div>

                    {/* Metric chips */}
                    <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] font-mono">
                      <div className="bg-slate-950/60 px-1.5 py-1 rounded text-center">
                        <span className="text-slate-500 block text-[8.5px]">DISTANCE</span>
                        <span className="font-bold text-slate-200">{hosp.distanceKm} km</span>
                      </div>
                      <div className="bg-slate-950/60 px-1.5 py-1 rounded text-center">
                        <span className="text-slate-500 block text-[8.5px]">EST. ETA</span>
                        <span className="font-bold text-slate-200">~{hosp.etaMinutes} min</span>
                      </div>
                      <div className="bg-slate-950/60 px-1.5 py-1 rounded text-center">
                        <span className="text-slate-500 block text-[8.5px]">EMERGENCY</span>
                        <span className="font-bold text-emerald-400">{hosp.emergencyBeds} beds</span>
                      </div>
                    </div>

                    {/* Facilities & Contact */}
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80 text-[10px]">
                      <div className="flex items-center gap-1.5 text-slate-400 flex-wrap">
                        {hosp.helipad && (
                          <span className="bg-emerald-950/60 text-emerald-300 px-1 rounded text-[9px]">
                            🚁 Helipad
                          </span>
                        )}
                        {hosp.bloodBank && (
                          <span className="bg-rose-950/60 text-rose-300 px-1 rounded text-[9px]">
                            🩸 Blood
                          </span>
                        )}
                        {hosp.icuBeds > 0 && (
                          <span className="bg-blue-950/60 text-blue-300 px-1 rounded text-[9px]">
                            ICU: {hosp.icuBeds}
                          </span>
                        )}
                      </div>
                      <a
                        href={`tel:${hosp.contactNumber.split('/')[0].trim()}`}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono font-semibold"
                        title="Emergency hotline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{hosp.contactNumber.split('/')[0].trim()}</span>
                      </a>
                    </div>

                    {hosp.alternateRoute && hosp.accessRouteStatus !== 'Accessible' && (
                      <div className="mt-1.5 p-1 rounded bg-amber-950/40 border border-amber-900/60 text-[9.5px] text-amber-300 font-mono">
                        <span className="font-bold">Alt Route: </span>
                        {hosp.alternateRoute}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 p-2">No direct healthcare center registered.</div>
              )}
            </div>
          </div>

          {/* Status & Recommended Action */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Status:</span>
              <span
                className={`font-semibold font-mono px-2 py-0.5 rounded text-[11px] ${
                  selectedZone.status === 'ROAD AT RISK' || selectedZone.status === 'CRITICAL'
                    ? 'text-red-400 bg-red-950/60'
                    : 'text-amber-400 bg-amber-950/60'
                }`}
              >
                {selectedZone.status}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium block mb-1">Recommended Action:</span>
              <p className="text-slate-200 leading-relaxed">{selectedZone.recommendedAction}</p>
            </div>
          </div>

          {/* AI Model Inspect Button */}
          {onOpenAiModel && (
            <button
              id="inspect-ai-model-btn"
              onClick={() => onOpenAiModel(selectedZone)}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Simulate in AI Risk Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Floating Hospital Card (when a hospital pin is clicked directly on map) */}
      {selectedHospital && !selectedZone && (
        <div
          id="hospital-map-card"
          className="absolute bottom-4 right-4 z-30 w-80 sm:w-96 rounded-2xl bg-[#081f1d]/95 backdrop-blur-xl border border-emerald-700/80 shadow-2xl p-5 text-slate-100 transition-all"
        >
          <div className="flex items-start justify-between gap-3 border-b border-emerald-900/60 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <Hospital className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                  {selectedHospital.type}
                </span>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {selectedHospital.name}
                </h4>
              </div>
            </div>
            <button
              onClick={() => setSelectedHospital(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">State / District:</span>
              <span className="font-medium text-white">{selectedHospital.state} ({selectedHospital.district})</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Nearest Road:</span>
              <span className="font-mono text-emerald-300 font-medium">{selectedHospital.nearestRoad}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Access Status:</span>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                  selectedHospital.accessRouteStatus === 'Accessible'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {selectedHospital.accessRouteStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-xl bg-slate-900/80 border border-emerald-900/40">
                <span className="text-[10px] text-slate-400 block">Emergency Beds</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {selectedHospital.emergencyBeds}
                </span>
                <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                  (ICU: {selectedHospital.icuBeds})
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-emerald-900/40">
                <span className="text-[10px] text-slate-400 block">Air Evacuation</span>
                <span className="text-xs font-semibold text-slate-200">
                  {selectedHospital.helipad ? '🚁 Helipad Ready' : 'Ground Transit'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-emerald-900/60">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                {selectedHospital.bloodBank && <span>🩸 Blood Bank</span>}
                {selectedHospital.ambulanceAvailable && <span>🚑 24/7 Ambulance</span>}
              </div>
              <a
                href={`tel:${selectedHospital.contactNumber.split('/')[0].trim()}`}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Emergency</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
