import { BACKTEST_ACCURACY, BACKTEST_CASES } from '../data/backtest'
import { BACKTEST_METHOD, CONTROL_NOTE, EVENT_NOTES } from '../data/backtestNotes'
import {
  DEMO_FALSE_ALARMS,
  DEMO_HONEST_NOTE,
  DEMO_INFO,
  DEMO_METHOD,
  DEMO_MISSES,
} from '../data/demoAccuracy'
import { MODEL_INFO } from '../data/modelInfo'
import { LevelBadge } from './risk'

function isGoodVerdict(verdict: string): boolean {
  const v = verdict.toUpperCase()
  return v.includes('HIT') || v.includes('CORRECT')
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const good = isGoodVerdict(verdict)
  const color = good ? '#34D399' : '#F87171'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {verdict}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const isEvent = type === 'event'
  return (
    <span className="inline-flex items-center rounded-full border border-[#1E2D47] bg-[#16233C] px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-[#E8EEF7]">
      {isEvent ? 'Event' : 'Control'}
    </span>
  )
}

function ModelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#1E2D47] py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-[14px] text-[#8CA0B8]">{label}</span>
      <span className="text-right text-[14px] font-medium text-[#E8EEF7]">{value}</span>
    </div>
  )
}

export default function AccuracyView() {
  const importanceEntries = Object.entries(MODEL_INFO.featureImportance ?? {})
  const maxImportance = importanceEntries.reduce((m, [, v]) => Math.max(m, Number(v) || 0), 0)

  const summaryCards = [
    { value: `${DEMO_INFO.eventsCaught}/${DEMO_INFO.eventsTotal}`, label: 'Asli events pakde gaye (unseen years)' },
    { value: String(DEMO_INFO.falseAlarms), label: 'Galat alarms (false alarms)' },
    { value: `${DEMO_INFO.totalRows}`, label: 'Total labeled rows (521/521)' },
    { value: '96.7–97.8%', label: 'Alag train splits par score' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">
          {DEMO_INFO.accuracyPct.toFixed(1)}%
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-[#8CA0B8]">
          {DEMO_INFO.accuracyLabel} — 138/140 asli landslides pakde, sirf 6 false alarms
        </p>
        <p className="mt-1 text-[12px] text-[#8CA0B8]">
          1,042 labeled rows • 521 events + 521 January controls • har row me source
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
            <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">{card.value}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#8CA0B8]">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="mb-4 text-[20px] font-bold text-[#E8EEF7]">Ye test kaise hua</p>
        <ol className="flex flex-col gap-3">
          {DEMO_METHOD.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-[14px] leading-relaxed text-[#8CA0B8]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/15 text-[12px] font-bold text-[#60A5FA]">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
          <p className="mb-4 text-[20px] font-bold text-[#E8EEF7]">Model</p>
          <ModelRow label="Version" value={MODEL_INFO.version} />
          <ModelRow label="Best model" value={MODEL_INFO.bestModel} />
          <ModelRow label="Trained on" value={MODEL_INFO.trainedOn} />
          <ModelRow
            label="Split"
            value={`Train ${DEMO_INFO.trainDesc} (762 rows) • Test ${DEMO_INFO.testDesc} (280 rows)`}
          />
          <ModelRow label="Accuracy (unseen years)" value={`${DEMO_INFO.accuracyPct.toFixed(1)}%`} />
          <ModelRow label="Feature source" value={DEMO_INFO.featureSource} />
          <ModelRow label="Khud verify karo" value={DEMO_INFO.verifyCommand} />
        </div>

        <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
          <p className="mb-4 text-[20px] font-bold text-[#E8EEF7]">Feature Importance</p>
          {importanceEntries.length === 0 ? (
            <p className="text-[14px] text-[#8CA0B8]">Feature importance available nahi hai.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {importanceEntries.map(([label, rawValue]) => {
                const value = Number(rawValue) || 0
                const pct = maxImportance > 0 ? Math.min(100, Math.max(0, (value / maxImportance) * 100)) : 0
                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] text-[#E8EEF7]">{label}</span>
                      <span className="text-[13px] font-medium whitespace-nowrap text-[#8CA0B8]">
                        {value.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#16233C]">
                      <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="mb-2 text-[20px] font-bold text-[#E8EEF7]">2 misses — chhupaye nahi</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-[#1E2D47] text-left">
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Event</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Date</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Rain 24h</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Kyun? (analysis note)</th>
                <th className="pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Source</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_MISSES.map((m) => (
                <tr key={m.event} className="border-b border-[#1E2D47] last:border-b-0">
                  <td className="py-3 pr-3 font-medium text-[#E8EEF7]">{m.event}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-[#8CA0B8]">{m.date}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-[#8CA0B8]">{m.rain24} mm</td>
                  <td className="min-w-[260px] max-w-[380px] py-3 pr-3 text-[13px] leading-relaxed text-[#8CA0B8]">
                    {m.note}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-medium whitespace-nowrap text-[#3B82F6] underline underline-offset-2"
                    >
                      Source ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-[#8CA0B8]">{DEMO_FALSE_ALARMS}</p>
      </div>

      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="mb-2 text-[20px] font-bold text-[#E8EEF7]">
          Purana V4 backtest (itihaasik — formula se seekha model)
        </p>
        <p className="mb-4 text-[14px] leading-relaxed text-[#8CA0B8]">
          Ye purane GradientBoosting model ka backtest hai, jiske labels ek formula se bane the — iski
          asli parakh {BACKTEST_ACCURACY.toFixed(1)}% thi. Upar wala naya model ise replace karta
          hai. Hum purana record chhupate nahi, isliye ye yahan rakha hai.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-[#1E2D47] text-left">
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Type</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Name</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Location</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Date</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Rain 24h</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Rain 3d</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Rain 30d</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Soil</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Score</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Level</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Verdict</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Kyun? (analysis note)</th>
                <th className="pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Source</th>
              </tr>
            </thead>
            <tbody>
              {BACKTEST_CASES.map((c, idx) => (
                <tr key={`${c.name}-${c.date}-${idx}`} className="border-b border-[#1E2D47] last:border-b-0">
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <TypeBadge type={c.type} />
                  </td>
                  <td className="max-w-[180px] truncate py-3 pr-3 font-medium text-[#E8EEF7]" title={c.name}>
                    {c.name}
                  </td>
                  <td className="max-w-[160px] truncate py-3 pr-3 whitespace-nowrap text-[#8CA0B8]">
                    {c.location}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-[#E8EEF7]">{c.date}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-[#E8EEF7]">{c.rain24}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-[#E8EEF7]">{c.rain3d}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-[#E8EEF7]">{c.rain30d}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-[#E8EEF7]">{c.soil}</td>
                  <td className="py-3 pr-3 font-bold whitespace-nowrap text-[#E8EEF7]">
                    {Math.round(c.score)}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <LevelBadge level={c.level} />
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <VerdictBadge verdict={c.verdict} />
                  </td>
                  <td className="min-w-[260px] max-w-[360px] py-3 pr-3 text-[13px] leading-relaxed text-[#8CA0B8]">
                    {c.type === 'event' ? (EVENT_NOTES[c.name] ?? '—') : CONTROL_NOTE}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    {c.sourceUrl ? (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={c.sourceTitle}
                        className="text-[13px] font-medium whitespace-nowrap text-[#3B82F6] underline underline-offset-2"
                      >
                        Source ↗
                      </a>
                    ) : (
                      <span className="text-[13px] text-[#8CA0B8]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-[#8CA0B8]">
          Purane model ki test methodology: {BACKTEST_METHOD[0]}
        </p>
      </div>

      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="mb-2 text-[16px] font-bold text-[#E8EEF7]">Honest Note</p>
        <p className="text-[14px] leading-relaxed text-[#8CA0B8]">{DEMO_HONEST_NOTE}</p>
      </div>
    </div>
  )
}
