import type { Person } from './types'

/**
 * Turning a drafted message into something the visitor can actually send.
 *
 * The awkward truth this has to work around: members of Congress mostly do not
 * publish email addresses. They use webforms, deliberately, to filter
 * non-constituents. In the current data only 2 of 437 House members and 86 of
 * 100 senators even list a contact form URL, and essentially none list a direct
 * address — so a prefilled "to:" is impossible for most of Congress.
 *
 * Phone, by contrast, is populated for every single member, and congressional
 * offices tally calls far more seriously than email. So the UI leads with the
 * phone number and a script, and treats email as the secondary path.
 *
 * State and local officials (phases 5 and 7) generally DO publish direct
 * addresses, so the mailto path becomes the primary one there. This is written
 * to handle both without special-casing at the call site.
 */

/**
 * mailto: URLs break somewhere above ~2000 characters on Windows and older
 * clients — the message is silently truncated, which is worse than failing.
 * Drafts are written to stay under this, and copy-to-clipboard is always
 * offered as the path that cannot break.
 */
export const MAILTO_SAFE_LENGTH = 1500

export type ContactMethod = 'email' | 'webform' | 'website' | 'phone' | 'copy'

export interface ContactPlan {
  /** How this person can actually be reached, best first. */
  methods: ContactMethod[]
  email: string | null
  webform: string | null
  website: string | null
  phone: string | null
  /** True when we can prefill a recipient; false means copy-and-paste. */
  canPrefillRecipient: boolean
  note: string | null
}

export function contactPlan(p: Person & { email?: string | null }): ContactPlan {
  const email = p.email ?? null
  const webform = p.contact_form ?? null
  const website = p.website ?? null
  const phone = p.phone ?? null

  const methods: ContactMethod[] = []
  if (phone) methods.push('phone')
  if (email) methods.push('email')
  else if (webform) methods.push('webform')
  else if (website) methods.push('website')
  methods.push('copy')

  let note: string | null = null
  if (!email && webform) {
    note =
      'This office does not publish an email address — it accepts messages only through its own web form. We will copy your message so you can paste it there.'
  } else if (!email && !webform && website) {
    note =
      'This office does not publish an email address. We will copy your message and open their site, where the contact form is usually under "Contact".'
  }

  return {
    methods,
    email,
    webform,
    website,
    phone,
    canPrefillRecipient: Boolean(email),
    note,
  }
}

function truncateForUrl(body: string, limit: number): string {
  if (body.length <= limit) return body
  return body.slice(0, limit - 40).trimEnd() + '\n\n[continued — see copied text]'
}

export function gmailUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to,
    su: subject,
    body: truncateForUrl(body, 8000),
  })
  return `https://mail.google.com/mail/?${params.toString()}`
}

export function outlookUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    to,
    subject,
    body: truncateForUrl(body, 8000),
  })
  return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`
}

export function mailtoUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    subject,
    body: truncateForUrl(body, MAILTO_SAFE_LENGTH),
  })
  return `mailto:${to}?${params.toString()}`
}

/** Digits only, for tel: links on mobile. */
export function telUrl(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, '')}`
}
