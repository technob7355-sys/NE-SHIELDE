import type { QualityStatus } from '../../services/dataQuality'

/**
 * Operational guidance rules by risk category + data quality.
 * Generic, defensible, and explicitly NOT an official government warning.
 * NEVER evacuation orders.
 */
export function guidanceFor(
  level: string | null,
  quality: QualityStatus,
): { title: string; text: string } {
  if (quality === 'unavailable' || quality === 'stale' || quality === 'loading' || !level) {
    return {
      title: 'Treat with caution — data unavailable',
      text: 'Live inputs are missing or stale for this zone. Do not assume it is safe. Verify conditions through field reports or the district authority before any decision.',
    }
  }
  switch (level) {
    case 'Critical':
      return {
        title: 'Notify district authority',
        text: 'Increase monitoring frequency and verify field conditions (road status, slope cracks, drainage). Coordinate with the local disaster-management authority.',
      }
    case 'High':
      return {
        title: 'Field verification advised',
        text: 'Review recent rainfall and any field/blockage reports for this stretch. Keep the district control room informed.',
      }
    case 'Moderate':
      return {
        title: 'Watch the rainfall trend',
        text: 'No immediate action. Re-check if rainfall intensifies or the 3-day outlook rises.',
      }
    default:
      return {
        title: 'Routine monitoring',
        text: 'Conditions normal. Continue routine monitoring of rainfall and field reports.',
      }
  }
}

export default function Recommendations({
  level,
  quality,
}: {
  level: string | null
  quality: QualityStatus
}) {
  const g = guidanceFor(level, quality)
  return (
    <div className="rounded-xl border border-[#1E2D47] bg-[#16233C] p-4">
      <p className="mb-1 text-[13px] font-bold tracking-wider text-[#8CA0B8] uppercase">
        Operational guidance
      </p>
      <p className="text-[15px] font-medium text-[#E8EEF7]">{g.title}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-[#8CA0B8]">{g.text}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-[#8CA0B8]">
        Operational guidance — not an official government warning.
      </p>
    </div>
  )
}
