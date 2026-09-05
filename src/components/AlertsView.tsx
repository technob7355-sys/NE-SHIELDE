import React, { useState } from 'react';
import { AlertItem, RiskLevel } from '../types';
import { ShieldAlert, CheckCircle, Eye, BellRing, Filter, Clock } from 'lucide-react';

interface AlertsViewProps {
  alerts: AlertItem[];
  onAcknowledge: (id: string) => void;
  onViewAlertOnMap: (alert: AlertItem) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onAcknowledge,
  onViewAlertOnMap,
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'unack'>('all');

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'critical') return alert.level === 'Critical';
    if (filter === 'unack') return !alert.acknowledged;
    return true;
  });

  const getAlertIcon = (level: RiskLevel) => {
    switch (level) {
      case 'Critical':
        return '🔴';
      case 'High':
        return '🟠';
      case 'Moderate':
        return '🟡';
      case 'Low':
        return '🟢';
    }
  };

  const getAlertPill = (level: RiskLevel) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-950/80 text-red-300 border-red-800/80';
      case 'High':
        return 'bg-orange-950/80 text-orange-300 border-orange-800/80';
      case 'Moderate':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-800/80';
      default:
        return 'bg-green-950/80 text-green-300 border-green-800/80';
    }
  };

  return (
    <div id="alerts-view" className="w-full max-w-5xl mx-auto py-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1 uppercase tracking-wider">
            <BellRing className="w-4 h-4" />
            <span>Feature 3 • Emergency Dispatch</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            ACTIVE ALERTS
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time landslide hazards and road advisories across Northeast India
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filter === 'critical'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Critical</span>
            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40">
              {alerts.filter((a) => a.level === 'Critical').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('unack')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'unack'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending Action
          </button>
        </div>
      </div>

      {/* Alert List Rows (Clean & Readable) */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400">
            No alerts match the selected criteria.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isAck = alert.acknowledged;

            return (
              <div
                key={alert.id}
                id={`alert-row-${alert.id}`}
                className={`p-4 sm:p-5 rounded-2xl bg-[#0b1326] border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  alert.level === 'Critical'
                    ? 'border-red-900/50 hover:border-red-700/80 shadow-lg shadow-red-950/20'
                    : 'border-slate-800 hover:border-slate-700'
                } ${isAck ? 'opacity-70 bg-[#080e1c]' : ''}`}
              >
                {/* Left: Indicator, Location, Summary, Time */}
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="text-xl sm:text-2xl mt-0.5 flex-shrink-0">
                    {getAlertIcon(alert.level)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getAlertPill(
                          alert.level
                        )}`}
                      >
                        {alert.level}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {alert.location}
                      </h3>
                      <span className="text-xs font-mono font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700">
                        Risk: {alert.riskScore}
                      </span>
                      {isAck && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Acknowledged
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-200 leading-snug">
                      {alert.summary}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {alert.timeAgo}
                      </span>
                      {alert.roadAffected && (
                        <span className="text-blue-400 font-medium">
                          Road: {alert.roadAffected}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions: Acknowledge & View */}
                <div className="flex items-center gap-2.5 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <button
                    id={`ack-btn-${alert.id}`}
                    onClick={() => onAcknowledge(alert.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isAck
                        ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <CheckCircle className={`w-3.5 h-3.5 ${isAck ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{isAck ? 'Acknowledged' : 'Acknowledge'}</span>
                  </button>

                  <button
                    id={`view-map-btn-${alert.id}`}
                    onClick={() => onViewAlertOnMap(alert)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md active:scale-[0.98]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View on Map</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
