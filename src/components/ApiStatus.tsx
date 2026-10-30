import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { formatTimeWithSecondsIST } from './risk'

const FORECAST_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=27.17&longitude=88.52&hourly=precipitation&past_days=1&forecast_days=0'
const ARCHIVE_URL =
  'https://archive-api.open-meteo.com/v1/archive?latitude=27.17&longitude=88.52&start_date=2022-06-01&end_date=2022-06-07&daily=precipitation_sum'

interface ApiCheckResult {
  ok: boolean
  latencyMs: number | null
  checkedAt: string | null
  error: string | null
}

export default function ApiStatus() {
  const [status, setStatus] = useState<ApiCheckResult>({
    ok: false,
    latencyMs: null,
    checkedAt: null,
    error: null,
  })
  const [checking, setChecking] = useState(false)
  const mountedRef = useRef(true)

  const runCheck = useCallback(async () => {
    setChecking(true)
    const start = performance.now()
    let forecastOk = false
    let archiveOk = false
    let errorMsg: string | null = null
    try {
      const [forecastRes, archiveRes] = await Promise.allSettled([
        fetch(FORECAST_URL),
        fetch(ARCHIVE_URL),
      ])
      if (forecastRes.status === 'fulfilled' && forecastRes.value.ok) {
        forecastOk = true
      } else if (forecastRes.status === 'rejected') {
        errorMsg =
          forecastRes.reason instanceof Error ? forecastRes.reason.message : 'Forecast API request failed'
      }
      if (archiveRes.status === 'fulfilled' && archiveRes.value.ok) {
        archiveOk = true
      } else if (archiveRes.status === 'rejected') {
        const msg =
          archiveRes.reason instanceof Error ? archiveRes.reason.message : 'Archive API request failed'
        errorMsg = errorMsg ? `${errorMsg}; ${msg}` : msg
      }
      if (!forecastOk && !errorMsg) errorMsg = 'Forecast API did not return OK'
      if (!archiveOk && forecastOk && !errorMsg) errorMsg = 'Archive API did not return OK'
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'API check failed'
    }
    const latencyMs = Math.round(performance.now() - start)
    if (!mountedRef.current) return
    setStatus({
      ok: forecastOk && archiveOk,
      latencyMs,
      checkedAt: new Date().toISOString(),
      error: forecastOk && archiveOk ? null : errorMsg,
    })
    setChecking(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void runCheck()
    return () => {
      mountedRef.current = false
    }
  }, [runCheck])

  const dotColor = status.ok ? '#34D399' : '#F87171'

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: checking && !status.checkedAt ? 'var(--muted)' : dotColor }}
          aria-hidden="true"
        />
        <span className="text-[13px] font-medium text-(--text)">
          {checking && !status.checkedAt ? 'Checking API…' : status.ok ? 'API Connected' : 'API Failed'}
        </span>
      </div>
      {status.latencyMs !== null ? (
        <span className="text-[12px] text-(--muted) whitespace-nowrap">{status.latencyMs} ms</span>
      ) : null}
      {status.checkedAt ? (
        <span className="text-[12px] text-(--muted) whitespace-nowrap">
          Checked {formatTimeWithSecondsIST(status.checkedAt)} IST
        </span>
      ) : null}
      <a
        href={FORECAST_URL}
        target="_blank"
        rel="noreferrer"
        className="text-[12px] text-(--muted) underline underline-offset-2"
      >
        Forecast API
      </a>
      <a
        href={ARCHIVE_URL}
        target="_blank"
        rel="noreferrer"
        className="text-[12px] text-(--muted) underline underline-offset-2"
      >
        Archive API
      </a>
      <button
        type="button"
        onClick={() => void runCheck()}
        disabled={checking}
        className="inline-flex items-center gap-1 rounded-lg border border-(--border) bg-(--surface-2) px-2 py-1 text-[12px] font-medium text-(--text) disabled:opacity-50"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        {checking ? 'Checking…' : 'Refresh'}
      </button>
      {status.error ? (
        <span className="w-full text-[12px] text-[#F87171] line-clamp-2">{status.error}</span>
      ) : null}
    </div>
  )
}
