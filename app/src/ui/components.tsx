import { useEffect, useRef, type ReactNode } from 'react'

export function Button({
  children,
  onClick,
  tone = 'plain',
  type = 'button',
  disabled,
  wide,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'plain' | 'in' | 'out' | 'panel' | 'quiet'
  type?: 'button' | 'submit'
  disabled?: boolean
  wide?: boolean
}) {
  return (
    <button
      type={type}
      className={`btn btn--${tone}${wide ? ' btn--wide' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

/**
 * A panel that slides up over the screen for one focused task.
 * Escape and the backdrop both close it; focus moves in on open so keyboard
 * and screen-reader users land inside rather than behind it.
 */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only pull focus if nothing inside already has it — a field marked
    // autoFocus has claimed it by now, and stealing it back leaves the user
    // typing into nothing.
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Hold the page still underneath. `overflow: hidden` alone is ignored by
  // Safari on iOS, which happily scrolls the tins away behind the sheet, so
  // the body is pinned at its current offset and put back on close.
  useEffect(() => {
    const body = document.body
    const y = window.scrollY
    const before = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
    }
    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'
    return () => {
      Object.assign(body.style, before)
      window.scrollTo(0, y)
    }
  }, [])

  // The on-screen keyboard does not make the window shorter on iOS — it
  // shrinks the visual viewport. Measuring that is what keeps Save above the
  // keys rather than behind them.
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const measure = () => {
      document.documentElement.style.setProperty('--visible-height', `${viewport.height}px`)
    }
    measure()
    viewport.addEventListener('resize', measure)
    return () => {
      viewport.removeEventListener('resize', measure)
      document.documentElement.style.removeProperty('--visible-height')
    }
  }, [])

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        ref={panel}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet__head">
          <h2>{title}</h2>
          <button className="sheet__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="notice" role="alert">
      {children}
    </p>
  )
}
