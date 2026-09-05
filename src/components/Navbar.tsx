import React from 'react';
import { NavTab } from '../types';
import { Shield, Map, Bell, PlusCircle, Info, Satellite } from 'lucide-react';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadAlertsCount: number;
  onOpenIsroAtlas?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  unreadAlertsCount,
  onOpenIsroAtlas,
}) => {
  return (
    <>
      {/* Desktop & Tablet Top Navigation */}
      <header
        id="main-app-header"
        className="sticky top-0 z-40 w-full bg-[#080d1a]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 transition-all"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.25)] cursor-pointer"
              onClick={() => onTabChange('overview')}
            >
              <Shield className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white font-mono">
                  NE-SHIELD
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/70 font-semibold">
                  OPERATIONAL
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Landslide Early Warning System</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300">Region: Northeast India</span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-emerald-400 font-mono font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  LIVE
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ISRO Landslide Atlas 2023 Intelligence trigger */}
            {onOpenIsroAtlas && (
              <button
                id="btn-isro-atlas-nav"
                onClick={onOpenIsroAtlas}
                title="Open NRSC/ISRO Landslide Atlas of India Database & Scientific Models"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/70 border border-indigo-700/60 text-indigo-200 hover:bg-indigo-900/60 hover:text-white transition-all text-xs font-mono font-bold shadow-sm"
              >
                <Satellite className="w-3.5 h-3.5 text-indigo-400" />
                <span>ISRO ATLAS 2023</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-900 text-indigo-300 font-normal">80.9k</span>
              </button>
            )}

            {/* Desktop 4-Item Nav */}
            <nav className="hidden md:flex items-center gap-1.5 bg-[#0e1629] p-1 rounded-xl border border-slate-800">
              <button
                id="nav-overview"
                onClick={() => onTabChange('overview')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Overview
              </button>
              <button
                id="nav-map"
                onClick={() => onTabChange('map')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'map'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Risk Map
              </button>
              <button
                id="nav-alerts"
                onClick={() => onTabChange('alerts')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'alerts'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>Alerts</span>
                {unreadAlertsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-mono font-bold">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>
              <button
                id="nav-report"
                onClick={() => onTabChange('report')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'report'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Report Hazard
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation (Overview, Map, Alerts, Report) */}
      <nav
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080d1a]/95 backdrop-blur-xl border-t border-slate-800 px-4 py-2 flex items-center justify-around shadow-2xl"
      >
        <button
          onClick={() => onTabChange('overview')}
          className={`flex flex-col items-center gap-1 p-1.5 text-[11px] font-semibold transition-colors ${
            activeTab === 'overview' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => onTabChange('map')}
          className={`flex flex-col items-center gap-1 p-1.5 text-[11px] font-semibold transition-colors ${
            activeTab === 'map' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Map className="w-5 h-5" />
          <span>Map</span>
        </button>

        <button
          onClick={() => onTabChange('alerts')}
          className={`relative flex flex-col items-center gap-1 p-1.5 text-[11px] font-semibold transition-colors ${
            activeTab === 'alerts' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span>Alerts</span>
          {unreadAlertsCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        <button
          onClick={() => onTabChange('report')}
          className={`flex flex-col items-center gap-1 p-1.5 text-[11px] font-semibold transition-colors ${
            activeTab === 'report' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PlusCircle className="w-5 h-5" />
          <span>Report</span>
        </button>
      </nav>
    </>
  );
};
