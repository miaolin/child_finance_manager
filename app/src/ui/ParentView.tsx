import { useState } from 'react'
import type {
  CategoryEdits,
  ChildEdits,
  ChoreEdits,
  NewCategory,
  NewChore,
} from '../data/repo.ts'
import { formatCents, isValidAmountCents, parseAmountToCents } from '../domain/money.ts'
import type {
  AllowanceCadence,
  Category,
  Child,
  Chore,
  Settings,
  TransactionKind,
} from '../domain/types.ts'
import { Button, Field, Notice } from './components.tsx'

type Tab = 'earn' | 'spend' | 'chores' | 'children'

const TABS: { id: Tab; label: string }[] = [
  { id: 'earn', label: 'Ways to earn' },
  { id: 'spend', label: 'Ways to spend' },
  { id: 'chores', label: 'Chores' },
  { id: 'children', label: 'Allowance and limits' },
]

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function ParentView({
  categories,
  chores,
  children,
  settings,
  onAddCategory,
  onUpdateCategory,
  onArchiveCategory,
  onAddChore,
  onUpdateChore,
  onArchiveChore,
  onUpdateChild,
  onLock,
}: {
  categories: Category[]
  chores: Chore[]
  children: Child[]
  settings: Settings
  onAddCategory: (category: NewCategory) => Promise<void>
  onUpdateCategory: (id: string, edits: CategoryEdits) => Promise<void>
  onArchiveCategory: (id: string) => Promise<void>
  onAddChore: (chore: NewChore) => Promise<void>
  onUpdateChore: (id: string, edits: ChoreEdits) => Promise<void>
  onArchiveChore: (id: string) => Promise<void>
  onUpdateChild: (id: string, edits: ChildEdits) => Promise<void>
  onLock: () => void
}) {
  const [tab, setTab] = useState<Tab>('earn')

  return (
    <div className="parent">
      <div className="parent__head">
        <h2>Rules</h2>
        <button className="parent__lock" onClick={onLock}>
          Lock
        </button>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab${tab === t.id ? ' tab--on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'earn' || tab === 'spend' ? (
        <CategoryEditor
          kind={tab === 'earn' ? 'in' : 'out'}
          categories={categories}
          onAdd={onAddCategory}
          onUpdate={onUpdateCategory}
          onArchive={onArchiveCategory}
        />
      ) : null}

      {tab === 'chores' ? (
        <ChoreEditor
          chores={chores}
          settings={settings}
          onAdd={onAddChore}
          onUpdate={onUpdateChore}
          onArchive={onArchiveChore}
        />
      ) : null}

      {tab === 'children' ? (
        <ChildRules children={children} settings={settings} onUpdateChild={onUpdateChild} />
      ) : null}
    </div>
  )
}

function CategoryEditor({
  kind,
  categories,
  onAdd,
  onUpdate,
  onArchive,
}: {
  kind: TransactionKind
  categories: Category[]
  onAdd: (category: NewCategory) => Promise<void>
  onUpdate: (id: string, edits: CategoryEdits) => Promise<void>
  onArchive: (id: string) => Promise<void>
}) {
  const live = categories.filter((c) => c.appliesTo === kind && !c.archivedAt)
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  async function add() {
    if (label.trim() === '') {
      setProblem('Give it a name the child will recognise.')
      return
    }
    setProblem(null)
    await onAdd({ label: label.trim(), emoji: emoji.trim() || '⭐', appliesTo: kind })
    setLabel('')
    setEmoji('')
  }

  return (
    <section className="rules">
      <p className="rules__intro">
        {kind === 'in'
          ? 'What the children can say money came from.'
          : 'What the children can say they spent money on.'}
      </p>

      <ul className="rows">
        {live.map((category) => (
          <li key={category.id} className="row">
            <input
              className="row__emoji"
              aria-label={`Emoji for ${category.label}`}
              value={category.emoji}
              onChange={(event) => void onUpdate(category.id, { emoji: event.target.value })}
            />
            <input
              className="row__label"
              aria-label={`Name for ${category.label}`}
              value={category.label}
              onChange={(event) => void onUpdate(category.id, { label: event.target.value })}
            />
            <button
              className="row__remove"
              aria-label={`Remove ${category.label}`}
              onClick={() => void onArchive(category.id)}
              disabled={live.length <= 1}
              title={live.length <= 1 ? 'Keep at least one' : undefined}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form
        className="addrow"
        onSubmit={(event) => {
          event.preventDefault()
          void add()
        }}
      >
        <input
          className="row__emoji"
          aria-label="Emoji"
          placeholder="⭐"
          value={emoji}
          onChange={(event) => setEmoji(event.target.value)}
        />
        <input
          className="row__label"
          aria-label={kind === 'in' ? 'New way to earn' : 'New way to spend'}
          placeholder={kind === 'in' ? 'Birthday money' : 'Football cards'}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Button type="submit">Add</Button>
      </form>

      {problem ? <Notice>{problem}</Notice> : null}
      <p className="rules__note">
        Removing one hides it from the children. Entries already recorded against it keep their
        name in the history.
      </p>
    </section>
  )
}

function ChoreEditor({
  chores,
  settings,
  onAdd,
  onUpdate,
  onArchive,
}: {
  chores: Chore[]
  settings: Settings
  onAdd: (chore: NewChore) => Promise<void>
  onUpdate: (id: string, edits: ChoreEdits) => Promise<void>
  onArchive: (id: string) => Promise<void>
}) {
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState('')
  const [pay, setPay] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  async function add() {
    const cents = parseAmountToCents(pay)
    if (label.trim() === '') {
      setProblem('Give the job a name.')
      return
    }
    if (cents === null || !isValidAmountCents(cents)) {
      setProblem('Say what the job pays, as an amount bigger than zero.')
      return
    }
    setProblem(null)
    await onAdd({ label: label.trim(), emoji: emoji.trim() || '🧹', payoutCents: cents })
    setLabel('')
    setEmoji('')
    setPay('')
  }

  return (
    <section className="rules">
      <p className="rules__intro">
        Jobs with a fixed price. A child claims one in a tap, so the amount is never mistyped.
      </p>

      {chores.length === 0 ? (
        <p className="rules__empty">No chores yet. Add the first one below.</p>
      ) : (
        <ul className="rows">
          {chores.map((chore) => (
            <li key={chore.id} className="row">
              <input
                className="row__emoji"
                aria-label={`Emoji for ${chore.label}`}
                value={chore.emoji}
                onChange={(event) => void onUpdate(chore.id, { emoji: event.target.value })}
              />
              <input
                className="row__label"
                aria-label={`Name for ${chore.label}`}
                value={chore.label}
                onChange={(event) => void onUpdate(chore.id, { label: event.target.value })}
              />
              <span className="row__pay figure">{formatCents(chore.payoutCents, settings)}</span>
              <button
                className="row__remove"
                aria-label={`Remove ${chore.label}`}
                onClick={() => void onArchive(chore.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="addrow"
        onSubmit={(event) => {
          event.preventDefault()
          void add()
        }}
      >
        <input
          className="row__emoji"
          aria-label="Emoji"
          placeholder="🧹"
          value={emoji}
          onChange={(event) => setEmoji(event.target.value)}
        />
        <input
          className="row__label"
          aria-label="New chore"
          placeholder="Tidy the shed"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <input
          className="row__pay-input figure"
          aria-label="Pays"
          inputMode="decimal"
          placeholder="5.00"
          value={pay}
          onChange={(event) => setPay(event.target.value)}
        />
        <Button type="submit">Add</Button>
      </form>

      {problem ? <Notice>{problem}</Notice> : null}
    </section>
  )
}

function ChildRules({
  children,
  settings,
  onUpdateChild,
}: {
  children: Child[]
  settings: Settings
  onUpdateChild: (id: string, edits: ChildEdits) => Promise<void>
}) {
  if (children.length === 0) {
    return <p className="rules__empty">Add a child first, then their rules appear here.</p>
  }

  return (
    <section className="rules">
      {children.map((child) => (
        <ChildRuleCard
          key={child.id}
          child={child}
          settings={settings}
          onUpdateChild={onUpdateChild}
        />
      ))}
    </section>
  )
}

function ChildRuleCard({
  child,
  settings,
  onUpdateChild,
}: {
  child: Child
  settings: Settings
  onUpdateChild: (id: string, edits: ChildEdits) => Promise<void>
}) {
  const allowance = child.allowance
  const [amount, setAmount] = useState(
    allowance && allowance.amountCents > 0 ? (allowance.amountCents / 100).toFixed(2) : '',
  )
  const [cadence, setCadence] = useState<AllowanceCadence>(allowance?.cadence ?? 'none')
  const [anchor, setAnchor] = useState(allowance?.anchor ?? 1)
  const [perPurchase, setPerPurchase] = useState(
    child.limits?.perPurchaseCents ? (child.limits.perPurchaseCents / 100).toFixed(2) : '',
  )
  const [perWeek, setPerWeek] = useState(
    child.limits?.perWeekCents ? (child.limits.perWeekCents / 100).toFixed(2) : '',
  )
  const [saved, setSaved] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function save() {
    const amountCents = parseAmountToCents(amount) ?? 0
    if (cadence !== 'none' && !isValidAmountCents(amountCents)) {
      setProblem('Set how much the allowance is, or turn it off.')
      return
    }
    const purchase = perPurchase.trim() === '' ? undefined : parseAmountToCents(perPurchase)
    const week = perWeek.trim() === '' ? undefined : parseAmountToCents(perWeek)
    if ((purchase !== undefined && purchase === null) || (week !== undefined && week === null)) {
      setProblem('A limit has to be an amount, or empty for no limit.')
      return
    }
    setProblem(null)

    await onUpdateChild(child.id, {
      allowance: {
        amountCents,
        cadence,
        anchor,
        // Starting an allowance now should not back-pay: mark it paid up to
        // today so the first credit lands on the next due date.
        lastPaidOn:
          allowance?.cadence === cadence && allowance?.lastPaidOn
            ? allowance.lastPaidOn
            : new Date().toISOString().slice(0, 10),
      },
      limits: {
        perPurchaseCents: purchase ?? undefined,
        perWeekCents: week ?? undefined,
      },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="rulecard">
      <h3>
        <span aria-hidden="true">{child.emoji}</span> {child.name}
      </h3>

      <div className="rulecard__grid">
        <Field label="Allowance">
          <select
            className="input"
            value={cadence}
            onChange={(event) => setCadence(event.target.value as AllowanceCadence)}
          >
            <option value="none">None</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </select>
        </Field>

        {cadence === 'none' ? null : (
          <>
            <Field label="How much">
              <input
                className="input figure"
                inputMode="decimal"
                placeholder="5.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
            <Field label={cadence === 'weekly' ? 'On' : 'Day of the month'}>
              {cadence === 'weekly' ? (
                <select
                  className="input"
                  value={anchor}
                  onChange={(event) => setAnchor(Number(event.target.value))}
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input figure"
                  type="number"
                  min={1}
                  max={28}
                  value={anchor}
                  onChange={(event) => setAnchor(Number(event.target.value))}
                />
              )}
            </Field>
          </>
        )}

        <Field label="Most for one purchase" hint="Leave empty for no limit">
          <input
            className="input figure"
            inputMode="decimal"
            placeholder="No limit"
            value={perPurchase}
            onChange={(event) => setPerPurchase(event.target.value)}
          />
        </Field>

        <Field label="Most in a week" hint="Monday to Sunday">
          <input
            className="input figure"
            inputMode="decimal"
            placeholder="No limit"
            value={perWeek}
            onChange={(event) => setPerWeek(event.target.value)}
          />
        </Field>
      </div>

      {allowance?.lastPaidOn && cadence !== 'none' ? (
        <p className="rulecard__note">
          Allowance paid up to {allowance.lastPaidOn}. The next one lands on its own; the app
          catches up any that were missed while it was closed.
        </p>
      ) : null}

      {problem ? <Notice>{problem}</Notice> : null}

      <div className="rulecard__actions">
        <Button tone="panel" onClick={() => void save()}>
          Save {child.name}&apos;s rules
        </Button>
        {saved ? <span className="rulecard__saved">Saved</span> : null}
      </div>

      <p className="rulecard__summary figure">
        {summarise(child, settings)}
      </p>
    </div>
  )
}

function summarise(child: Child, settings: Settings): string {
  const parts: string[] = []
  const allowance = child.allowance
  if (allowance && allowance.cadence !== 'none' && allowance.amountCents > 0) {
    const when =
      allowance.cadence === 'weekly'
        ? `every ${WEEKDAYS[allowance.anchor] ?? 'Monday'}`
        : `on day ${allowance.anchor} of the month`
    parts.push(`${formatCents(allowance.amountCents, settings)} ${when}`)
  }
  if (child.limits?.perPurchaseCents) {
    parts.push(`up to ${formatCents(child.limits.perPurchaseCents, settings)} a purchase`)
  }
  if (child.limits?.perWeekCents) {
    parts.push(`up to ${formatCents(child.limits.perWeekCents, settings)} a week`)
  }
  return parts.length === 0 ? 'No rules set' : parts.join(', ')
}
