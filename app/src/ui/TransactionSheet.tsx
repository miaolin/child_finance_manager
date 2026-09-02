import { useState } from 'react'
import { categoriesFor } from '../domain/categories.ts'
import { checkSpend, type LimitBreach } from '../domain/limits.ts'
import { formatCents, isValidAmountCents, parseAmountToCents } from '../domain/money.ts'
import type {
  Category,
  Child,
  Settings,
  Transaction,
  TransactionKind,
} from '../domain/types.ts'
import { Button, Field, Notice, Sheet } from './components.tsx'
import { todayIso } from './dates.ts'

export interface TransactionDraft {
  amountCents: number
  kind: TransactionKind
  categoryId: string
  note: string
  occurredOn: string
}

/**
 * One form for both adding and editing. `existing` decides which, so the two
 * paths cannot drift apart in validation or wording.
 */
export function TransactionSheet({
  child,
  kind,
  existing,
  settings,
  allCategories,
  transactions,
  onSave,
  onDelete,
  onClose,
}: {
  child: Child
  kind: TransactionKind
  existing?: Transaction
  settings: Settings
  allCategories: Category[]
  transactions: Transaction[]
  onSave: (draft: TransactionDraft) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const categories = categoriesFor(allCategories, kind)
  const [amount, setAmount] = useState(
    existing ? (existing.amountCents / 100).toFixed(2) : '',
  )
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? categories[0]?.id ?? 'other-in',
  )
  const [note, setNote] = useState(existing?.note ?? '')
  const [occurredOn, setOccurredOn] = useState(existing?.occurredOn ?? todayIso())
  const [problem, setProblem] = useState<string | null>(null)
  const [breach, setBreach] = useState<LimitBreach | null>(null)
  const [saving, setSaving] = useState(false)

  const cents = parseAmountToCents(amount)
  const preview = cents !== null && isValidAmountCents(cents) ? formatCents(cents, settings) : null

  const verb = kind === 'in' ? 'Earn money' : 'Spent money'
  const title = existing ? (kind === 'in' ? 'Edit money in' : 'Edit spending') : verb

  async function save() {
    if (cents === null || !isValidAmountCents(cents)) {
      setProblem('Enter how much money, as a number bigger than zero.')
      return
    }
    if (occurredOn > todayIso()) {
      setProblem('That day has not happened yet. Pick today or a day already past.')
      return
    }

    // Limits are a rule about recording, so they are checked here rather than
    // in the repo — the child gets told which one they hit and by how much.
    if (kind === 'out') {
      const hit = checkSpend({
        child,
        transactions,
        amountCents: cents,
        occurredOn,
        excludeTransactionId: existing?.id,
      })
      if (hit) {
        setBreach(hit)
        setProblem(null)
        return
      }
    }

    setBreach(null)
    setProblem(null)
    setSaving(true)
    try {
      await onSave({ amountCents: cents, kind, categoryId, note: note.trim(), occurredOn })
      onClose()
    } catch {
      setProblem('That did not save. Try again.')
      setSaving(false)
    }
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <form
        className="txform"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <p className="txform__who">
          {child.emoji} {child.name}
        </p>

        <Field label="How much?" hint={preview ? `That is ${preview}` : undefined}>
          <input
            className="input input--amount figure"
            inputMode="decimal"
            autoFocus
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>

        <fieldset className="picker">
          <legend className="field__label">
            {kind === 'in' ? 'Where did it come from?' : 'What was it for?'}
          </legend>
          <div className="picker__grid">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`chip${category.id === categoryId ? ' chip--on' : ''}`}
                aria-pressed={category.id === categoryId}
                onClick={() => setCategoryId(category.id)}
              >
                <span className="chip__emoji" aria-hidden="true">
                  {category.emoji}
                </span>
                <span className="chip__label">{category.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <Field label="Add a note" hint="Optional">
          <input
            className="input"
            placeholder={kind === 'in' ? 'Birthday money from Grandma' : 'Ice cream at the park'}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <Field label="When?">
          <input
            className="input"
            type="date"
            max={todayIso()}
            value={occurredOn}
            onChange={(event) => setOccurredOn(event.target.value)}
          />
        </Field>

        {problem ? <Notice>{problem}</Notice> : null}
        {breach ? (
          <Notice>
            {breach.kind === 'per-purchase'
              ? `That is more than one purchase is allowed to be. The limit is ${formatCents(
                  breach.limitCents,
                  settings,
                )}, so this is ${formatCents(breach.overByCents, settings)} too much.`
              : `That would make ${formatCents(
                  breach.wouldBeCents,
                  settings,
                )} spent this week, and the limit is ${formatCents(
                  breach.limitCents,
                  settings,
                )}. It is ${formatCents(breach.overByCents, settings)} too much.`}{' '}
            Ask a parent, or record a smaller amount.
          </Notice>
        ) : null}

        <div className="txform__actions">
          <Button type="submit" tone={kind} wide disabled={saving}>
            {existing ? 'Save changes' : verb}
          </Button>
          {onDelete ? (
            <Button
              tone="quiet"
              onClick={() => {
                void onDelete().then(onClose)
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </form>
    </Sheet>
  )
}
