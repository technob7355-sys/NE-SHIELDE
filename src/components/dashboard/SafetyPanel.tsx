import { HeartPulse, Loader2, Navigation, X } from 'lucide-react'
import type { Hospital } from '../../services/places'
import type { EvacRoute } from '../../services/routes'

export type HospitalsState = 'loading' | 'ok' | 'empty' | 'error'
export type RoutesState = 'idle' | 'loading' | 'ok' | 'empty' | 'error'

/** Polyline colors for Route A / B / C — shared with the map. */
export const ROUTE_COLORS = ['#38BDF6', '#A78BFA', '#34D399']

interface SafetyPanelProps {
  hospitals: Hospital[]
  hospitalsState: HospitalsState
  selectedHospital: Hospital | null
  routes: EvacRoute[]
  routesState: RoutesState
  onSelectHospital: (hospital: Hospital) => void
  onClearHospital: () => void
}

function StatusLine({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-2 py-2 text-[13px] text-[#8CA0B8]">
      {icon}
      {text}
    </p>
  )
}

/**
 * Safety section: real nearby hospitals (OpenStreetMap) and evacuation
 * driving routes (OSRM). Every state is honest — loading, empty, or
 * "unavailable". No fake data anywhere.
 */
export default function SafetyPanel({
  hospitals,
  hospitalsState,
  selectedHospital,
  routes,
  routesState,
  onSelectHospital,
  onClearHospital,
}: SafetyPanelProps) {
  return (
    <div className="mt-1">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-[#F87171]" aria-hidden="true" />
        <p className="text-[13px] font-bold tracking-wide text-[#E8EEF7] uppercase">
          Nearby Hospitals
        </p>
      </div>

      {hospitalsState === 'loading' ? (
        <StatusLine
          icon={<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          text="Finding nearby hospitals…"
        />
      ) : null}
      {hospitalsState === 'error' ? (
        <StatusLine text="Hospital data unavailable right now." />
      ) : null}
      {hospitalsState === 'empty' ? (
        <StatusLine text="No hospitals found within 20 km." />
      ) : null}
      {hospitalsState === 'ok' ? (
        <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-0.5">
          {hospitals.map((h) => {
            const active = selectedHospital?.name === h.name && selectedHospital?.lat === h.lat
            return (
              <button
                key={`${h.lat},${h.lng}`}
                type="button"
                onClick={() => onSelectHospital(h)}
                aria-pressed={active}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-200 active:scale-[0.98] ${
                  active
                    ? 'border-[#3B82F6] bg-[#3B82F6]/15'
                    : 'border-[#1E2D47] bg-[#0B1220] hover:border-[#3B82F6]/60'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-[#E8EEF7]">
                    {h.name}
                  </span>
                  <span className="block text-[11px] text-[#8CA0B8]">
                    {h.kind === 'clinic' ? 'Clinic' : 'Hospital'}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] font-medium whitespace-nowrap text-[#8CA0B8]">
                  {h.distanceKm.toFixed(1)} km
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {selectedHospital ? (
        <div className="mt-3 rounded-lg border border-[#1E2D47] bg-[#0B1220] p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-bold text-[#E8EEF7]">
              <Navigation className="h-3.5 w-3.5 shrink-0 text-[#38BDF6]" aria-hidden="true" />
              <span className="truncate">Routes to {selectedHospital.name}</span>
            </p>
            <button
              type="button"
              onClick={onClearHospital}
              className="shrink-0 rounded-md p-1 text-[#8CA0B8] transition-colors hover:bg-[#1E2D47] hover:text-[#E8EEF7]"
              aria-label="Clear selected hospital"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {routesState === 'loading' ? (
            <StatusLine
              icon={<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              text="Calculating routes…"
            />
          ) : null}
          {routesState === 'error' ? (
            <StatusLine text="Route data unavailable right now." />
          ) : null}
          {routesState === 'empty' ? (
            <StatusLine text="No driving route found." />
          ) : null}
          {routesState === 'ok' ? (
            <div className="flex flex-col gap-1.5">
              {routes.map((r, i) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#1E2D47] bg-[#101A2E] px-3 py-2"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <span className="text-[13px] font-medium text-[#E8EEF7]">{r.label}</span>
                  </span>
                  <span className="text-[12px] whitespace-nowrap text-[#8CA0B8]">
                    {r.distanceKm.toFixed(1)} km · {r.durationMin} min drive
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
