import { DEMO_HONEST_NOTE, DEMO_INFO } from '../data/demoAccuracy'
import { MODEL_INFO } from '../data/modelInfo'

function ModelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#1E2D47] py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-[14px] text-[#8CA0B8]">{label}</span>
      <span className="text-right text-[14px] font-medium text-[#E8EEF7]">{value}</span>
    </div>
  )
}

const TEST_STEPS = [
  'Sirf geele din: 521 asli landslides + 1,042 aise geele din jab landslide nahi hua. January (sukhe) controls hataye — wo bahut aasaan the.',
  'Har incident + uske negatives = ek group; time se kaata: purane 60% groups train (939 rows), naye 40% groups test (624 rows). Model ne test wale din kabhi nahi dekhe.',
  'Verdict: event-day par sahi = HIT, choot gaya = MISS; geele non-event din par alarm = false alarm.',
]

export default function TechnicalEvaluation() {
  const importanceEntries = Object.entries(MODEL_INFO.featureImportance ?? {})
  const maxImportance = importanceEntries.reduce((m, [, v]) => Math.max(m, Number(v) || 0), 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">
          {DEMO_INFO.accuracyPct.toFixed(1)}%
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-[#8CA0B8]">
          {DEMO_INFO.accuracyLabel} — {DEMO_INFO.eventsCaught}/{DEMO_INFO.eventsTotal} asli landslides pakde, {DEMO_INFO.falseAlarms} false alarms
        </p>
        <p className="mt-1 text-[13px] text-[#8CA0B8]">
          {DEMO_INFO.totalRows.toLocaleString('en-IN')} rows • {DEMO_INFO.eventRows} events + {DEMO_INFO.hardNegRows} wet-day non-events • January controls: 0
        </p>
      </div>

      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="mb-4 text-[20px] font-bold text-[#E8EEF7]">Ye test kaise hua</p>
        <ol className="flex flex-col gap-3">
          {TEST_STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-[14px] leading-relaxed text-[#8CA0B8]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/15 text-[13px] font-bold text-[#60A5FA]">
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
            value={`Train ${DEMO_INFO.trainDesc} (${DEMO_INFO.trainRows} rows) • Test ${DEMO_INFO.testDesc} (${DEMO_INFO.testRows} rows)`}
          />
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
                      <span className="truncate text-[14px] text-[#E8EEF7]" title={label}>{label}</span>
                      <span className="text-[14px] font-medium whitespace-nowrap text-[#8CA0B8]">
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
        <p className="mb-2 text-[20px] font-bold text-[#E8EEF7]">97.1% kyon hataya</p>
        <p className="text-[14px] leading-relaxed text-[#8CA0B8]">
          Purana 97.1% January (sukhe) controls par tha — bahut aasaan negatives. Wahi model geele
          dino par 97.9% false alarm deta tha. Isliye headline ab sirf geele-dino wala asli test hai:
          68.3%. Purana V4 model (formula labels, 57.1% real-event backtest) replace ho chuka hai.
        </p>
      </div>

      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="mb-2 text-[18px] font-bold text-[#E8EEF7]">Honest Note</p>
        <p className="text-[14px] leading-relaxed text-[#8CA0B8]">{DEMO_HONEST_NOTE}</p>
      </div>
    </div>
  )
}
