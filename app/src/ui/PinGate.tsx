import { useState } from 'react'
import { PIN_LENGTH, createGate, isPinSet, isValidPin, pinMatches } from '../domain/parentGate.ts'
import type { Settings } from '../domain/types.ts'
import { Button, Field, Notice } from './components.tsx'

/**
 * Asks for the parent PIN, or sets one the first time. Unlocking is reported
 * upward and held in memory only, so closing the app locks it again.
 */
export function PinGate({
  settings,
  onSetGate,
  onUnlock,
}: {
  settings: Settings
  onSetGate: (gate: Settings['parent']) => Promise<void>
  onUnlock: () => void
}) {
  const alreadySet = isPinSet(settings.parent)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setProblem(null)
    if (!isValidPin(pin)) {
      setProblem(`The PIN is ${PIN_LENGTH} digits.`)
      return
    }
    setBusy(true)
    try {
      if (alreadySet) {
        if (await pinMatches(settings.parent, pin)) onUnlock()
        else {
          setProblem('That PIN does not match. Try again.')
          setPin('')
        }
      } else {
        if (pin !== confirmPin) {
          setProblem('The two PINs are different. Type the same one twice.')
          return
        }
        await onSetGate(await createGate(pin))
        onUnlock()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate">
      <p className="gate__lock" aria-hidden="true">
        🔒
      </p>
      <h2>{alreadySet ? 'Parent PIN' : 'Choose a parent PIN'}</h2>
      <p className="gate__text">
        {alreadySet
          ? 'This part of the app is where the rules are set.'
          : `Pick ${PIN_LENGTH} digits. It keeps the rules out of reach of whoever is using the tins.`}
      </p>

      <form
        className="gate__form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field label={alreadySet ? 'PIN' : 'New PIN'}>
          <input
            className="input input--pin figure"
            inputMode="numeric"
            autoComplete="off"
            type="password"
            autoFocus
            maxLength={PIN_LENGTH}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
          />
        </Field>

        {alreadySet ? null : (
          <Field label="Type it again">
            <input
              className="input input--pin figure"
              inputMode="numeric"
              autoComplete="off"
              type="password"
              maxLength={PIN_LENGTH}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
            />
          </Field>
        )}

        {problem ? <Notice>{problem}</Notice> : null}

        <Button type="submit" tone="panel" wide disabled={busy}>
          {alreadySet ? 'Unlock' : 'Set the PIN'}
        </Button>
      </form>

      <p className="gate__caveat">
        A PIN keeps a child out of the rules. It is not a lock on the data —
        anyone who knows their way around a browser can get past it.
      </p>
    </div>
  )
}
