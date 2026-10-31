import { DEMO_INFO } from '../data/demoAccuracy'

/**
 * Model Accuracy — customer-facing summary only.
 * Backend test details (caught/missed/false-alarm breakdowns, the 97.1% journey)
 * stay out of this page; the 1,042-row CSV + train scripts remain the expo proof.
 */
export default function AccuracyView() {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-8 text-center sm:p-12">
        <p className="text-[56px] leading-none font-bold text-[#E8EEF7] sm:text-[72px]">
          {DEMO_INFO.accuracyPct.toFixed(1)}%
        </p>
        <p className="mt-3 text-[18px] font-semibold text-[#E8EEF7]">accuracy on unseen rainy days</p>
        <p className="mx-auto mt-3 max-w-[560px] text-[14px] leading-relaxed text-[#8CA0B8]">
          We tested the model on rainy days it had never seen before — it predicted the risk level
          correctly about 2 out of 3 times.
        </p>
      </div>
    </div>
  )
}
