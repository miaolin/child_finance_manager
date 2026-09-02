import { groupByDay, totalsFor } from '../domain/balance.ts'
import { categoryById } from '../domain/categories.ts'
import { formatCents, formatSignedCents } from '../domain/money.ts'
import type { Category, Child, Chore, Settings, Transaction } from '../domain/types.ts'
import { describeDay } from './dates.ts'

export function ChildScreen({
  child,
  transactions,
  categories,
  chores,
  settings,
  onGotMoney,
  onSpentMoney,
  onClaimChore,
  onEditTransaction,
  onEditChild,
}: {
  child: Child
  transactions: Transaction[]
  categories: Category[]
  chores: Chore[]
  settings: Settings
  onGotMoney: () => void
  onSpentMoney: () => void
  onClaimChore: (chore: Chore) => void
  onEditTransaction: (tx: Transaction) => void
  onEditChild: () => void
}) {
  const mine = transactions.filter((tx) => tx.childId === child.id)
  const totals = totalsFor(mine, child.id)
  const days = groupByDay(mine)

  return (
    <div className="child">
      <section className="balance" style={{ '--tin-color': child.color } as React.CSSProperties}>
        <p className="balance__who">
          <span aria-hidden="true">{child.emoji}</span> {child.name} has
        </p>
        <p className={`balance__figure figure${totals.balanceCents < 0 ? ' balance__figure--short' : ''}`}>
          {formatCents(totals.balanceCents, settings)}
        </p>
        <dl className="balance__totals figure">
          <div>
            <dt>Money in</dt>
            <dd>{formatCents(totals.inCents, settings)}</dd>
          </div>
          <div>
            <dt>Spent</dt>
            <dd>{formatCents(totals.outCents, settings)}</dd>
          </div>
        </dl>
      </section>

      <div className="child__actions">
        <button className="btn btn--in btn--wide" onClick={onGotMoney}>
          Earn money
        </button>
        <button className="btn btn--out btn--wide" onClick={onSpentMoney}>
          Spent money
        </button>
      </div>

      {chores.length > 0 ? (
        <section className="jobs">
          <h2 className="jobs__title">Jobs {child.name} can do</h2>
          <ul className="jobs__list">
            {chores.map((chore) => (
              <li key={chore.id}>
                <button className="job" onClick={() => onClaimChore(chore)}>
                  <span className="job__emoji" aria-hidden="true">
                    {chore.emoji}
                  </span>
                  <span className="job__label">{chore.label}</span>
                  <span className="job__pay figure">
                    {formatCents(chore.payoutCents, settings)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {days.length === 0 ? (
        <div className="empty empty--inline">
          <h2>Nothing recorded yet</h2>
          <p className="empty__text">
            Start with the money {child.name} already has: tap Earn money.
          </p>
        </div>
      ) : (
        <section className="history">
          {days.map(([day, items]) => (
            <div key={day} className="history__day">
              <h3 className="history__date">{describeDay(day, settings.locale)}</h3>
              <ul className="slips">
                {items.map((tx) => {
                  const category = categoryById(categories, tx.categoryId)
                  return (
                    <li key={tx.id}>
                      <button className="slip" onClick={() => onEditTransaction(tx)}>
                        <span className="slip__emoji" aria-hidden="true">
                          {category.emoji}
                        </span>
                        <span className="slip__what">
                          <span className="slip__label">{tx.note || category.label}</span>
                          {tx.note ? (
                            <span className="slip__category">{category.label}</span>
                          ) : null}
                        </span>
                        <span className={`slip__amount figure slip__amount--${tx.kind}`}>
                          {formatSignedCents(tx.amountCents, tx.kind, settings)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </section>
      )}

      <button className="child__edit" onClick={onEditChild}>
        Edit {child.name}
      </button>
    </div>
  )
}
