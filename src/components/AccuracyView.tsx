import { BACKTEST_ACCURACY, BACKTEST_CASES } from '../data/backtest'
import { MODEL_INFO } from '../data/modelInfo'

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
  const accuracyPct =
    BACKTEST_ACCURACY <= 1 ? `${(BACKTEST_ACCURACY * 100).toFixed(1)}%` : `${BACKTEST_ACCURACY.toFixed(1)}%`
  const importanceEntries = Object.entries(MODEL_INFO.featureImportance ?? {})
  const maxImportance = importanceEntries.reduce((m, [, v]) => Math.max(m, Number(v) || 0), 0)

  const fmtMetric = (v: number | string | undefined, digits = 2): string => {
    if (v === undefined || v === null) return '—'
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isNaN(n) ? String(v) : n.toFixed(digits)
  }
  const fmtAccuracy = (v: number | string | undefined): string => {
    if (v === undefined || v === null) return '—'
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isNaN(n)) return String(v)
    return n <= 1 ? `${(n * 100).toFixed(1)}%` : `${n.toFixed(1)}%`
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">{accuracyPct}</p>
        <p className="mt-2 text-[14px] leading-relaxed text-[#8CA0B8]">
          documented events + dry-season controls par sahi predictions
        </p>
        <p className="mt-1 text-[12px] text-[#8CA0B8]">
          {BACKTEST_CASES.length} backtest cases • events + controls dono shamil hain
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
          <p className="mb-4 text-[20px] font-bold text-[#E8EEF7]">Model</p>
          <ModelRow label="Version" value={MODEL_INFO.version} />
          <ModelRow label="Trained on" value={MODEL_INFO.trainedOn} />
          <ModelRow
            label="Split"
            value="Train 2018–2020 • Test 2021–2022 (model ne test data kabhi dekha nahi)"
          />
          <ModelRow label="Best model" value={MODEL_INFO.bestModel} />
          <ModelRow label="MAE" value={fmtMetric(MODEL_INFO.mae, 2)} />
          <ModelRow label="R²" value={fmtMetric(MODEL_INFO.r2, 4)} />
          <ModelRow label="Level accuracy" value={fmtAccuracy(MODEL_INFO.levelAccuracy)} />
          <ModelRow label="Train rows" value={String(MODEL_INFO.trainRows)} />
          <ModelRow label="Test rows" value={String(MODEL_INFO.testRows)} />
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
                const display =
                  maxImportance <= 1 ? `${(value * 100).toFixed(1)}%` : `${value.toFixed(1)}%`
                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] text-[#E8EEF7]">{label}</span>
                      <span className="text-[13px] font-medium whitespace-nowrap text-[#8CA0B8]">{display}</span>
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
        <p className="mb-4 text-[20px] font-bold text-[#E8EEF7]">Backtest</p>
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
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Score</th>
                <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Verdict</th>
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
                  <td className="py-3 pr-3 font-bold whitespace-nowrap text-[#E8EEF7]">
                    {Math.round(c.score)}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <VerdictBadge verdict={c.verdict} />
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
        {BACKTEST_CASES.length === 0 ? (
          <p className="mt-3 text-[14px] text-[#8CA0B8]">No backtest cases available.</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="mb-2 text-[16px] font-bold text-[#E8EEF7]">Honest Note</p>
        <p className="text-[14px] leading-relaxed text-[#8CA0B8]">
          Sach ye hai: model ke labels asli mausam data par ek transparent formula se bane hain — ye
          recorded landslide outcomes nahi hain. Isliye upar wala formula-test score model ki asal
          parakh nahi hai; asal parakh ye backtest hai, jisme model ne kai asli ghatnayein miss ki.
          Miss ki badi wajah: satellite grid ki baarish exact jagah se alag hoti hai, aur pahad
          kaatna/drainage jaise insaani kaaran mausam data me dikhte hi nahi.
        </p>
      </div>
    </div>
  )
}
