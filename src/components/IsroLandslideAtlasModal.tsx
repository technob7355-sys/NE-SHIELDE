import React, { useState } from 'react';
import {
  X,
  Database,
  Search,
  BookOpen,
  Award,
  Layers,
  Activity,
  Satellite,
  BarChart3,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ISRO_STATE_INVENTORY,
  ISRO_147_DISTRICT_RANKINGS,
  ISRO_LANDMARK_CASES,
  computeIsroEarlyWarning,
} from '../data/isroLandslideAtlas';

interface IsroLandslideAtlasModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDistrict?: string;
}

export const IsroLandslideAtlasModal: React.FC<IsroLandslideAtlasModalProps> = ({
  isOpen,
  onClose,
  defaultDistrict,
}) => {
  const [activeTab, setActiveTab] = useState<'districts' | 'inventory' | 'formula' | 'cases' | 'classification'>('districts');
  const [districtSearch, setDistrictSearch] = useState<string>(defaultDistrict || '');
  const [regionFilter, setRegionFilter] = useState<string>('All');

  // Early warning calculator state
  const [calcDR, setCalcDR] = useState<number>(120);
  const [calc3DCR, setCalc3DCR] = useState<number>(240);
  const [calc30DAR, setCalc30DAR] = useState<number>(450);
  const [calcSusceptibility, setCalcSusceptibility] = useState<'Moderate' | 'High' | 'Very High' | 'Severe'>('High');

  if (!isOpen) return null;

  // Filtered districts
  const filteredDistricts = ISRO_147_DISTRICT_RANKINGS.filter((item) => {
    const matchesSearch =
      item.district.toLowerCase().includes(districtSearch.toLowerCase()) ||
      item.state.toLowerCase().includes(districtSearch.toLowerCase()) ||
      item.rank.toString() === districtSearch.trim();
    const matchesRegion = regionFilter === 'All' || item.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  // Calculate live formula output
  const earlyWarningResult = computeIsroEarlyWarning(calcDR, calc3DCR, calc30DAR, calcSusceptibility);

  // Total mapped landslides
  const totalMappedPanIndia = ISRO_STATE_INVENTORY.reduce((acc, curr) => acc + curr.totalLandslides, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-[#091122] border border-blue-500/40 text-slate-100 shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#07132c] via-[#0d1e44] to-[#07132c] border-b border-blue-900/50 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mt-1">
              <Satellite className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                  NRSC / ISRO • FEBRUARY 2023
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
                  80,933 Landslides Mapped
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Landslide Atlas of India Intelligence
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Department of Space, Govt. of India • 1998-2022 Geospatial Inventory & Risk Exposure Ranking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800 bg-[#070e1c] overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('districts')}
            className={`px-3.5 py-2.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'districts'
                ? 'border-blue-500 text-blue-300 font-bold bg-blue-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>147 Ranked Districts (DEI)</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-300 font-bold bg-blue-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>State Inventory Database</span>
          </button>

          <button
            onClick={() => setActiveTab('formula')}
            className={`px-3.5 py-2.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'formula'
                ? 'border-blue-500 text-blue-300 font-bold bg-blue-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>ISRO Regression Model (Page 83)</span>
          </button>

          <button
            onClick={() => setActiveTab('cases')}
            className={`px-3.5 py-2.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'cases'
                ? 'border-blue-500 text-blue-300 font-bold bg-blue-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Landmark Disasters</span>
          </button>

          <button
            onClick={() => setActiveTab('classification')}
            className={`px-3.5 py-2.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'classification'
                ? 'border-blue-500 text-blue-300 font-bold bg-blue-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Varnes & InSAR Science</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-sm">
          {/* ========================================================================= */}
          {/* TAB 1: 147 DISTRICTS RANKING (TABLE 3) */}
          {/* ========================================================================= */}
          {activeTab === 'districts' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h4 className="text-white font-bold text-sm">
                    Socio-Economic Parameter Risk Exposure (DEI Index)
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Formula: DEI = DLD × (DSEPd_p + DSEPd_h + DSEPd_l + DSEPd_r) • 147 Mountainous Districts Ranked
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800">
                    Highest Exposure: Rudraprayag (#1), Tehri (#2), Thrissur (#3)
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    placeholder="Search district, state, or rank..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                  {['All', 'Northeast Himalayas', 'Northwest Himalayas', 'Western Ghats'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRegionFilter(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        regionFilter === r
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* District Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0c162c] text-slate-300 font-mono uppercase tracking-wider sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 w-16 text-center">Rank</th>
                        <th className="py-2.5 px-3">District</th>
                        <th className="py-2.5 px-3">State</th>
                        <th className="py-2.5 px-3">Physiographic Region</th>
                        <th className="py-2.5 px-3 text-right">Exposure Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                      {filteredDistricts.map((item) => {
                        const isTop10 = item.rank <= 10;
                        const isTop25 = item.rank <= 25;
                        return (
                          <tr
                            key={item.rank}
                            className={`hover:bg-blue-950/30 transition-colors ${
                              isTop10
                                ? 'bg-red-950/20'
                                : isTop25
                                ? 'bg-amber-950/15'
                                : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center font-bold">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                                  isTop10
                                    ? 'bg-red-600 text-white'
                                    : isTop25
                                    ? 'bg-amber-600/90 text-white'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                #{item.rank}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-white">
                              {item.district}
                            </td>
                            <td className="py-2 px-3 text-slate-300">{item.state}</td>
                            <td className="py-2 px-3 text-slate-400 text-[11px]">
                              {item.region}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {item.rank <= 10 ? (
                                <span className="text-red-400 font-bold">Extreme Priority</span>
                              ) : item.rank <= 35 ? (
                                <span className="text-orange-400 font-semibold">High Exposure</span>
                              ) : item.rank <= 70 ? (
                                <span className="text-amber-300">Moderate Exposure</span>
                              ) : (
                                <span className="text-slate-400">Baseline Exposure</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Showing {filteredDistricts.length} of 147 official ISRO-assessed districts. Derived from Census data & satellite landslide density.
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: STATE INVENTORY (TABLE 2 - 80,933 LANDSLIDES) */}
          {/* ========================================================================= */}
          {activeTab === 'inventory' && (
            <div className="space-y-5">
              {/* Macro Regional Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#0b1836] border border-blue-600/40">
                  <span className="text-[10px] font-mono text-blue-300 uppercase block">Northwest Himalayas</span>
                  <span className="text-3xl font-black text-white font-mono mt-1 block">66.5%</span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    0.14M sq. km • J&K, HP, Uttarakhand
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#091e2b] border border-cyan-600/40">
                  <span className="text-[10px] font-mono text-cyan-300 uppercase block">Northeast Himalayas</span>
                  <span className="text-3xl font-black text-white font-mono mt-1 block">18.8%</span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    0.18M sq. km • Mizoram, Tripura, Arunachal, Sikkim, Assam, etc.
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1c0d] border border-amber-600/40">
                  <span className="text-[10px] font-mono text-amber-300 uppercase block">Western Ghats & Konkan</span>
                  <span className="text-3xl font-black text-white font-mono mt-1 block">14.7%</span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    0.09M sq. km • Kerala, Maharashtra, Karnataka, Tamil Nadu
                  </span>
                </div>
              </div>

              {/* State Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0c162c] text-slate-300 font-mono uppercase tracking-wider sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">State / UT</th>
                        <th className="py-2.5 px-3 text-right">Monsoon 2014</th>
                        <th className="py-2.5 px-3 text-right">Monsoon 2017</th>
                        <th className="py-2.5 px-3 text-right">Field-Based</th>
                        <th className="py-2.5 px-3 text-right">Event-Based</th>
                        <th className="py-2.5 px-3 text-right font-bold text-white">Total Landslides</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                      {ISRO_STATE_INVENTORY.map((item) => (
                        <tr key={item.state} className="hover:bg-blue-950/20 transition-colors">
                          <td className="py-2 px-3 font-semibold text-white flex items-center gap-2">
                            <span>{item.state}</span>
                            <span className="text-[10px] text-slate-500">({item.region})</span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">{item.monsoon2014.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{item.monsoon2017.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{item.fieldBased > 0 ? item.fieldBased.toLocaleString() : '—'}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{item.eventBased > 0 ? item.eventBased.toLocaleString() : '—'}</td>
                          <td className="py-2 px-3 text-right font-black text-blue-300">
                            {item.totalLandslides.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#0a1224] border-t-2 border-slate-700 font-mono font-bold text-white">
                      <tr>
                        <td className="py-2.5 px-3">Pan-India Total</td>
                        <td className="py-2.5 px-3 text-right">17,698</td>
                        <td className="py-2.5 px-3 text-right">23,895</td>
                        <td className="py-2.5 px-3 text-right">2,266</td>
                        <td className="py-2.5 px-3 text-right">37,074</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 text-sm">
                          80,933
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ISRO REGRESSION MODEL (PAGE 83) */}
          {/* ========================================================================= */}
          {activeTab === 'formula' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-blue-300 uppercase">
                    Binary Logistic Regression Equation (Page 83, Figure 52)
                  </span>
                  <span className="text-[10px] font-mono text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                    IMD + MOSDAC + CPC Grounding
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-black/50 font-mono text-sm text-cyan-300 font-bold border border-blue-900/60">
                  z = -3.817 + 0.077 × DR + 0.058 × 3DCR + 0.009 × 30DAR
                </div>
                <p className="text-xs text-slate-300 mt-2 font-mono">
                  Trigger Probability: P(z) = 1 / (1 + e<sup>-z</sup>) • Tested along Dalhousie-Chamba, Uttarakhand & North East routes.
                </p>
              </div>

              {/* Interactive Formula Playground */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="text-xs font-mono font-bold uppercase text-slate-300 block">
                    Telemetry Input Variables
                  </span>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span>DR: Daily Rainfall (24h)</span>
                      <span className="text-blue-400 font-bold">{calcDR} mm</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={350}
                      value={calcDR}
                      onChange={(e) => setCalcDR(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span>3DCR: 3-Day Cumulative Rainfall</span>
                      <span className="text-cyan-400 font-bold">{calc3DCR} mm</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={600}
                      value={calc3DCR}
                      onChange={(e) => setCalc3DCR(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span>30DAR: 30-Day Antecedent Rainfall</span>
                      <span className="text-indigo-400 font-bold">{calc30DAR} mm</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1200}
                      value={calc30DAR}
                      onChange={(e) => setCalc30DAR(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-mono mb-1.5 text-slate-300">
                      Landslide Susceptibility Class:
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                      {(['Moderate', 'High', 'Very High', 'Severe'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setCalcSusceptibility(lvl)}
                          className={`py-1.5 rounded-lg font-semibold transition-all ${
                            calcSusceptibility === lvl
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Model Output Card */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                      ISRO Early Warning Output
                    </span>

                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-5xl font-black font-mono text-white">
                        {earlyWarningResult.triggerPercentage}%
                      </span>
                      <span className="text-sm font-mono text-slate-400">P(z) = {earlyWarningResult.triggerProbability}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/40 font-mono text-xs text-slate-300 border border-slate-800 mb-3">
                      {earlyWarningResult.formulaExplanation}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">ISRO Decision:</span>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-black font-mono tracking-wider ${
                          earlyWarningResult.decisionClass === 'Warning'
                            ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                            : earlyWarningResult.decisionClass === 'Watch'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : earlyWarningResult.decisionClass === 'Advisory'
                            ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                            : 'bg-green-950 text-green-300 border border-green-800'
                        }`}
                      >
                        {earlyWarningResult.decisionClass.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Matrix Reference */}
                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                    <span className="font-bold text-slate-300 block mb-1">Table 4 Decision Threshold:</span>
                    <div>P &gt; 0.85 &amp; Severe/Very High → Warning</div>
                    <div>0.75 ≤ P ≤ 0.85 &amp; High/Very High → Watch</div>
                    <div>P &lt; 0.75 → Advisory or Baseline</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: LANDMARK CASE STUDIES */}
          {/* ========================================================================= */}
          {activeTab === 'cases' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ISRO_LANDMARK_CASES.map((cs) => (
                <div
                  key={cs.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-700/60 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white leading-snug">{cs.name}</h4>
                      <span className="text-xs text-blue-400 font-mono">
                        {cs.district}, {cs.state} • {cs.date}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold whitespace-nowrap">
                      {cs.varnesClassification.split(' ')[0]}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="text-slate-300 leading-relaxed">{cs.keyObservation}</p>
                    <div className="pt-1 text-[11px] font-mono text-amber-300">
                      <span className="font-bold">Trigger:</span> {cs.trigger}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-500 font-mono">Sensors:</span>
                      {cs.sensorsUsed.map((sensor, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9.5px] font-mono"
                        >
                          {sensor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: VARNES & InSAR METHODOLOGY */}
          {/* ========================================================================= */}
          {activeTab === 'classification' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-white font-bold text-sm">
                  Varnes (1978) Classification of Slope Movements (Page 24)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-blue-400 font-bold block">1. Falls</span>
                    <span className="text-slate-400 text-[11px]">Rock Fall, Debris Fall, Earth Fall</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-blue-400 font-bold block">2. Topples</span>
                    <span className="text-slate-400 text-[11px]">Forward rotation out of slope</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-blue-400 font-bold block">3. Slides</span>
                    <span className="text-slate-400 text-[11px]">Rotational Slump &amp; Translational Planar</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-blue-400 font-bold block">4. Flows</span>
                    <span className="text-slate-400 text-[11px]">Debris Flow, Earth Flow, Mudflow</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs leading-relaxed">
                <h4 className="text-white font-bold text-sm">
                  Multi-Temporal SAR Interferometry (MT-InSAR) &amp; Kinematics (Page 64)
                </h4>
                <p>
                  NRSC utilizes Persistent Scatterer Interferometry (PSI) on Sentinel-1 C-band microwave radar data to detect millimeter-scale ground displacement. By analyzing the inverse velocity (1/v) time series, the Onset of Acceleration (OOA) identifies unstable slopes months before catastrophic failure.
                </p>
                <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-900/60 font-mono text-[11px] text-blue-300">
                  Case Study: Kikruma Landslide (Nagaland) — InSAR inverse velocity predicted slope failure for 26 July 2018; actual ground failure occurred 29 July 2018.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#070e1c] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span>Citation: Jain et al. (2023), NRSC/ISRO Hyderabad</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
