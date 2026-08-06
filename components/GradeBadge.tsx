import { GRADE_LABEL, GRADE_SHORT, GRADE_SYMBOL } from '@/lib/grades'
import type { Grade } from '@/lib/types'

/**
 * Never color alone. The symbol and the text label carry the meaning so the
 * badge still reads for colorblind users, in high-contrast mode, and when
 * screenshotted in grayscale — which is how most of these travel.
 */
export function GradeBadge({ grade, short = false }: { grade: Grade; short?: boolean }) {
  return (
    <span className={`badge ${grade}`}>
      <span className="sym" aria-hidden="true">{GRADE_SYMBOL[grade]}</span>
      {short ? GRADE_SHORT[grade] : GRADE_LABEL[grade]}
    </span>
  )
}
