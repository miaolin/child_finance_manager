import { useState } from 'react'
import type { Child } from '../domain/types.ts'
import { Button, Field, Notice, Sheet } from './components.tsx'

const EMOJI = ['🦊', '🐢', '🐼', '🦉', '🐙', '🦋', '🐝', '🦁', '🐬', '🦔', '🐸', '🦄']
const COLORS = ['#f7c548', '#e4572e', '#1f8a4c', '#2e7dd1', '#b5539c', '#5c4bc4']

export function ChildSheet({
  existing,
  onSave,
  onDelete,
  onClose,
}: {
  existing?: Child
  onSave: (fields: { name: string; emoji: string; color: string }) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [emoji, setEmoji] = useState(existing?.emoji ?? EMOJI[0])
  const [color, setColor] = useState(existing?.color ?? COLORS[0])
  const [problem, setProblem] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function save() {
    if (name.trim() === '') {
      setProblem('Give them a name so their tin can be told apart.')
      return
    }
    await onSave({ name: name.trim(), emoji, color })
    onClose()
  }

  return (
    <Sheet title={existing ? `Edit ${existing.name}` : 'Add someone'} onClose={onClose}>
      <form
        className="txform"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <Field label="Name">
          <input
            className="input"
            autoFocus
            placeholder="Mia"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <fieldset className="picker">
          <legend className="field__label">Pick a creature</legend>
          <div className="picker__grid picker__grid--emoji">
            {EMOJI.map((option) => (
              <button
                key={option}
                type="button"
                className={`chip chip--emoji${option === emoji ? ' chip--on' : ''}`}
                aria-label={option}
                aria-pressed={option === emoji}
                onClick={() => setEmoji(option)}
              >
                <span aria-hidden="true">{option}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="picker">
          <legend className="field__label">Pick a colour</legend>
          <div className="picker__grid picker__grid--color">
            {COLORS.map((option) => (
              <button
                key={option}
                type="button"
                className={`swatch${option === color ? ' swatch--on' : ''}`}
                style={{ background: option }}
                aria-label={option}
                aria-pressed={option === color}
                onClick={() => setColor(option)}
              />
            ))}
          </div>
        </fieldset>

        {problem ? <Notice>{problem}</Notice> : null}

        <div className="txform__actions">
          <Button type="submit" tone="panel" wide>
            {existing ? 'Save changes' : 'Add them'}
          </Button>
        </div>

        {onDelete ? (
          <div className="danger">
            {confirmingDelete ? (
              <>
                <p className="danger__text">
                  Deleting {existing?.name} also deletes every record of their money. This cannot
                  be undone.
                </p>
                <div className="danger__actions">
                  <Button
                    tone="out"
                    onClick={() => {
                      void onDelete().then(onClose)
                    }}
                  >
                    Yes, delete everything
                  </Button>
                  <Button tone="quiet" onClick={() => setConfirmingDelete(false)}>
                    Keep them
                  </Button>
                </div>
              </>
            ) : (
              <Button tone="quiet" onClick={() => setConfirmingDelete(true)}>
                Delete {existing?.name}
              </Button>
            )}
          </div>
        ) : null}
      </form>
    </Sheet>
  )
}
