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
    <span className="inline-flex items-center rounded-full border border-(--border) bg-(--surface-2) px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-(--text)">
      {isEvent ? 'Event' : 'Control'}
    </span>
  )
}

function ModelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-(--border) py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-[14px] text-(--muted)">{label}</span>
      <span className="text-right text-[14px] font-medium text-(--text)">{value}</span>
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
      <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
        <p className="text-[28px] leading-none font-bold text-(--text)">
          {DEMO_INFO.accuracyPct.toFixed(1)}%
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-(--muted)">
          {DEMO_INFO.accuracyLabel} — 138/140 asli landslides pakde, sirf 6 false alarms
        </p>
        <p className="mt-1 text-[12px] text-(--muted)">
          1,042 labeled rows • 521 events + 521 January controls • har row me source
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-(--border) bg-(--surface) p-5">
            <p className="text-[28px] leading-none font-bold text-(--text)">{card.value}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
        <p className="mb-4 text-[20px] font-bold text-(--text)">Ye test kaise hua</p>
        <ol className="flex flex-col gap-3">
          {DEMO_METHOD.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-[14px] leading-relaxed text-(--muted)">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--accent)/15 text-[12px] font-bold text-(--accent-soft)">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
          <p className="mb-4 text-[20px] font-bold text-(--text)">Model</p>
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

        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
          <p className="mb-4 text-[20px] font-bold text-(--text)">Feature Importance</p>
          {importanceEntries.length === 0 ? (
            <p className="text-[14px] text-(--muted)">Feature importance available nahi hai.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {importanceEntries.map(([label, rawValue]) => {
                const value = Number(rawValue) || 0
                const pct = maxImportance > 0 ? Math.min(100, Math.max(0, (value / maxImportance) * 100)) : 0
                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] text-(--text)">{label}</span>
                      <span className="text-[13px] font-medium whitespace-nowrap text-(--muted)">
                        {value.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-(--surface-2)">
                      <div className="h-full rounded-full bg-(--accent)" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
        <p className="mb-2 text-[20px] font-bold text-(--text)">2 misses — chhupaye nahi</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-(--border) text-left">
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Event</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Date</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Rain 24h</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Kyun? (analysis note)</th>
                <th className="pb-3 font-medium whitespace-nowrap text-(--muted)">Source</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_MISSES.map((m) => (
                <tr key={m.event} className="border-b border-(--border) last:border-b-0">
                  <td className="py-3 pr-3 font-medium text-(--text)">{m.event}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-(--muted)">{m.date}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-(--muted)">{m.rain24} mm</td>
                  <td className="min-w-[260px] max-w-[380px] py-3 pr-3 text-[13px] leading-relaxed text-(--muted)">
                    {m.note}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-medium whitespace-nowrap text-(--accent) underline underline-offset-2"
                    >
                      Source ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-(--muted)">{DEMO_FALSE_ALARMS}</p>
      </div>

      <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
        <p className="mb-2 text-[20px] font-bold text-(--text)">
          Purana V4 backtest (itihaasik — formula se seekha model)
        </p>
        <p className="mb-4 text-[14px] leading-relaxed text-(--muted)">
          Ye purane GradientBoosting model ka backtest hai, jiske labels ek formula se bane the — iski
          asli parakh {BACKTEST_ACCURACY.toFixed(1)}% thi. Upar wala naya model ise replace karta
          hai. Hum purana record chhupate nahi, isliye ye yahan rakha hai.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-(--border) text-left">
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Type</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Name</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Location</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Date</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Rain 24h</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Rain 3d</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Rain 30d</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Soil</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Score</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Level</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Verdict</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Kyun? (analysis note)</th>
                <th className="pb-3 font-medium whitespace-nowrap text-(--muted)">Source</th>
              </tr>
            </thead>
            <tbody>
              {BACKTEST_CASES.map((c, idx) => (
                <tr key={`${c.name}-${c.date}-${idx}`} className="border-b border-(--border) last:border-b-0">
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <TypeBadge type={c.type} />
                  </td>
                  <td className="max-w-[180px] truncate py-3 pr-3 font-medium text-(--text)" title={c.name}>
                    {c.name}
                  </td>
                  <td className="max-w-[160px] truncate py-3 pr-3 whitespace-nowrap text-(--muted)">
                    {c.location}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-(--text)">{c.date}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-(--text)">{c.rain24}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-(--text)">{c.rain3d}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-(--text)">{c.rain30d}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-(--text)">{c.soil}</td>
                  <td className="py-3 pr-3 font-bold whitespace-nowrap text-(--text)">
                    {Math.round(c.score)}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <LevelBadge level={c.level} />
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <VerdictBadge verdict={c.verdict} />
                  </td>
                  <td className="min-w-[260px] max-w-[360px] py-3 pr-3 text-[13px] leading-relaxed text-(--muted)">
                    {c.type === 'event' ? (EVENT_NOTES[c.name] ?? '—') : CONTROL_NOTE}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    {c.sourceUrl ? (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={c.sourceTitle}
                        className="text-[13px] font-medium whitespace-nowrap text-(--accent) underline underline-offset-2"
                      >
                        Source ↗
                      </a>
                    ) : (
                      <span className="text-[13px] text-(--muted)">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-(--muted)">
          Purane model ki test methodology: {BACKTEST_METHOD[0]}
        </p>
      </div>

      <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
        <p className="mb-2 text-[16px] font-bold text-(--text)">Honest Note</p>
        <p className="text-[14px] leading-relaxed text-(--muted)">{DEMO_HONEST_NOTE}</p>
      </div>
    </div>
  )
}
