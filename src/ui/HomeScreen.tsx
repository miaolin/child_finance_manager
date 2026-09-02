import { balanceCents } from '../domain/balance.ts'
import { formatCents } from '../domain/money.ts'
import type { Child, Settings, Transaction } from '../domain/types.ts'

export function HomeScreen({
  children,
  transactions,
  settings,
  onOpenChild,
  onAddChild,
}: {
  children: Child[]
  transactions: Transaction[]
  settings: Settings
  onOpenChild: (id: string) => void
  onAddChild: () => void
}) {
  if (children.length === 0) {
    return (
      <div className="empty">
        <p className="empty__coin" aria-hidden="true">
          🪙
        </p>
        <h2>Nobody has a tin yet</h2>
        <p className="empty__text">
          Add a child to start keeping track of what they have and what they spend.
        </p>
        <button className="btn btn--panel" onClick={onAddChild}>
          Add someone
        </button>
      </div>
    )
  }

  return (
    <div className="tins">
      {children.map((child) => {
        const cents = balanceCents(transactions, child.id)
        return (
          <button
            key={child.id}
            className="tin"
            style={{ '--tin-color': child.color } as React.CSSProperties}
            onClick={() => onOpenChild(child.id)}
          >
            <span className="tin__lid">
              <span className="tin__emoji" aria-hidden="true">
                {child.emoji}
              </span>
              <span className="tin__name">{child.name}</span>
            </span>
            <span className={`tin__amount figure${cents < 0 ? ' tin__amount--short' : ''}`}>
              {formatCents(cents, settings)}
            </span>
            <span className="tin__caption">
              {cents < 0 ? 'owes money' : 'to spend right now'}
            </span>
          </button>
        )
      })}

      <button className="tin tin--add" onClick={onAddChild}>
        <span className="tin__plus" aria-hidden="true">
          +
        </span>
        <span className="tin__name">Add someone</span>
      </button>
    </div>
  )
}
