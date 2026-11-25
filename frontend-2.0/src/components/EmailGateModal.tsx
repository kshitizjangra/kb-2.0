'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { Tape } from '@/components/collage/Decor'
import { API_BASE, LEAD_MAGNET } from '@/lib/kamna-data'
import './email-gate-modal.css'

interface EmailGateModalProps {
  onClose: () => void
  open?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function triggerDirectDownload(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function EmailGateModal({
  onClose,
  open = true,
}: EmailGateModalProps) {
  const [email, setEmail] = useState('')
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  )
  const [errorMsg, setErrorMsg] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()
  const emailId = useId()
  const optInId = useId()

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.documentElement.style.overflow

    if (!dialog.open) {
      dialog.showModal()
    }
    document.documentElement.style.overflow = 'hidden'
    dialog.querySelector<HTMLInputElement>('input[type="email"]')?.focus({
      preventScroll: true,
    })

    return () => {
      document.documentElement.style.overflow = previousOverflow
      if (dialog.open) {
        dialog.close()
      }
      if (trigger?.isConnected) {
        trigger.focus({ preventScroll: true })
      }
    }
  }, [open])

  useEffect(() => {
    if (status === 'success') {
      dialogRef.current
        ?.querySelector<HTMLButtonElement>('.egm-close')
        ?.focus({ preventScroll: true })
    }
  }, [status])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'loading') return

    const trimmed = email.trim()
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setStatus('error')
      setErrorMsg('Please enter a valid email address.')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    let downloadedViaApi = false

    try {
      const res = await fetch(`${API_BASE}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })

      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (data?.token) {
          const downloadUrl = `${API_BASE}/api/download?token=${encodeURIComponent(
            data.token
          )}`
          const fileRes = await fetch(downloadUrl, { cache: 'no-store' })
          if (fileRes.ok) {
            const blob = await fileRes.blob()
            const objectUrl = URL.createObjectURL(blob)
            triggerDirectDownload(objectUrl, 'decoded_linkedin_creators.pdf')
            URL.revokeObjectURL(objectUrl)
            downloadedViaApi = true
          }
        }
      }
    } catch {
      /* Backend unreachable — fall back to static PDF in /public */
    }

    if (!downloadedViaApi) {
      triggerDirectDownload(
        LEAD_MAGNET.pdfUrl,
        'decoded_linkedin_creators.pdf'
      )
    }

    if (newsletterOptIn) {
      try {
        await fetch(`${API_BASE}/api/newsletter/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed, source: 'pdf' }),
        })
      } catch {
        /* Newsletter backend optional in standalone mode */
      }
    }

    setStatus('success')
  }

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      className="egm-dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-busy={status === 'loading'}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="egm-panel">
        <Tape
          variant="pink"
          className="egm-tape"
          style={{
            width: 72,
            height: 18,
            left: '50%',
            top: -9,
            transform: 'translateX(-50%) rotate(-2deg)',
          }}
        />

        <button
          type="button"
          className="egm-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {status === 'success' ? (
          <div className="egm-success" role="status">
            <span className="eyebrow egm-kicker">Ready to download</span>
            <h2 id={titleId} className="egm-title serif">
              Dossier unlocked
            </h2>
            <p id={descId} className="egm-desc muted">
              Your download of{' '}
              <span className="egm-highlight">{LEAD_MAGNET.title}</span> should
              start automatically. Check your downloads folder.
            </p>
            <div className="egm-success-actions">
              <a
                href={LEAD_MAGNET.pdfUrl}
                download="decoded_linkedin_creators.pdf"
                className="link-underline"
              >
                DOWNLOAD AGAIN
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
              <button
                type="button"
                className="egm-done-btn"
                onClick={onClose}
              >
                CLOSE
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="eyebrow egm-kicker">FREE PDF DOSSIER</span>
            <h2 id={titleId} className="egm-title serif">
              Get Free Access
            </h2>
            <p id={descId} className="egm-desc muted">
              Enter your email and grab{' '}
              <span className="egm-highlight">{LEAD_MAGNET.title}</span>{' '}
              instantly.
            </p>

            <form className="egm-form" onSubmit={handleSubmit} noValidate>
              <div className="egm-field">
                <label className="small-caps egm-label" htmlFor={emailId}>
                  EMAIL ADDRESS
                </label>
                <input
                  id={emailId}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (errorMsg) setErrorMsg('')
                  }}
                  disabled={status === 'loading'}
                  aria-invalid={status === 'error'}
                  aria-describedby={errorMsg ? 'egm-error' : undefined}
                />
              </div>

              <label className="egm-optin" htmlFor={optInId}>
                <input
                  id={optInId}
                  type="checkbox"
                  checked={newsletterOptIn}
                  onChange={(event) =>
                    setNewsletterOptIn(event.target.checked)
                  }
                  disabled={status === 'loading'}
                />
                <span>
                  Also let me know when Kamna&apos;s newsletter drops (optional).
                </span>
              </label>

              {errorMsg ? (
                <p id="egm-error" className="egm-error" role="alert">
                  {errorMsg}
                </p>
              ) : null}

              <button
                type="submit"
                className="egm-submit"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Preparing PDF…' : 'Download free PDF'}
                <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </form>

            <p className="egm-footnote small-caps">
              NO SPAM. UNSUBSCRIBE ANYTIME.
            </p>
          </>
        )}
      </div>
    </dialog>
  )
}
