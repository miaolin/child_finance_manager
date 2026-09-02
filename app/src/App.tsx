import { useMemo, useState } from 'react'
import { createLocalRepo } from './data/localRepo.ts'
import { categoriesFor } from './domain/categories.ts'
import type { Chore, Transaction, TransactionKind } from './domain/types.ts'
import { ChildScreen } from './ui/ChildScreen.tsx'
import { ChildSheet } from './ui/ChildSheet.tsx'
import { HomeScreen } from './ui/HomeScreen.tsx'
import { ParentView } from './ui/ParentView.tsx'
import { PinGate } from './ui/PinGate.tsx'
import { SettingsSheet } from './ui/SettingsSheet.tsx'
import { TransactionSheet } from './ui/TransactionSheet.tsx'
import { todayIso } from './ui/dates.ts'
import { useFinance } from './ui/useFinance.ts'
import './app.css'

type Sheet =
  | { kind: 'none' }
  | { kind: 'add-child' }
  | { kind: 'edit-child'; childId: string }
  | { kind: 'add-transaction'; childId: string; direction: TransactionKind }
  | { kind: 'edit-transaction'; transaction: Transaction }
  | { kind: 'settings' }

export default function App() {
  // One repo for the life of the app. Swapping this line for a cloud-backed
  // implementation is the whole migration.
  const repo = useMemo(() => createLocalRepo(), [])
  const finance = useFinance(repo)

  const [openChildId, setOpenChildId] = useState<string | null>(null)
  const [inParentView, setInParentView] = useState(false)
  // Unlocking lives in memory only, so closing the app locks the rules again.
  const [parentUnlocked, setParentUnlocked] = useState(false)
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' })
  const closeSheet = () => setSheet({ kind: 'none' })

  const openChild = finance.children.find((child) => child.id === openChildId) ?? null
  const sheetChildId =
    sheet.kind === 'edit-child' || sheet.kind === 'add-transaction'
      ? sheet.childId
      : sheet.kind === 'edit-transaction'
        ? sheet.transaction.childId
        : null
  const sheetChild = finance.children.find((child) => child.id === sheetChildId) ?? null

  /**
   * Where a claimed chore is filed. The parent can rename or remove any
   * category, so this cannot assume "chores" still exists.
   */
  function choreCategoryId(): string {
    const earning = categoriesFor(finance.categories, 'in')
    return (earning.find((c) => c.id === 'chores') ?? earning[0])?.id ?? 'chores'
  }

  async function claimChore(chore: Chore) {
    if (!openChild) return
    await finance.addTransaction({
      childId: openChild.id,
      amountCents: chore.payoutCents,
      kind: 'in',
      categoryId: choreCategoryId(),
      note: chore.label,
      occurredOn: todayIso(),
    })
  }

  if (!finance.ready) return <div className="loading">Opening the tins…</div>

  return (
    <div className="app">
      <header className="topbar">
        {inParentView ? (
          <button
            className="topbar__back"
            onClick={() => {
              setInParentView(false)
              setParentUnlocked(false)
            }}
          >
            Back to the tins
          </button>
        ) : openChild ? (
          <button className="topbar__back" onClick={() => setOpenChildId(null)}>
            All tins
          </button>
        ) : (
          <h1 className="topbar__title">Pocket money</h1>
        )}

        <div className="topbar__right">
          {inParentView ? null : (
            <button className="topbar__settings" onClick={() => setInParentView(true)}>
              Parent 🔒
            </button>
          )}
          <button className="topbar__settings" onClick={() => setSheet({ kind: 'settings' })}>
            Settings
          </button>
        </div>
      </header>

      <main className="main">
        {inParentView ? (
          parentUnlocked ? (
            <ParentView
              categories={finance.categories}
              chores={finance.chores}
              children={finance.children}
              settings={finance.settings}
              onAddCategory={finance.addCategory}
              onUpdateCategory={finance.updateCategory}
              onArchiveCategory={finance.archiveCategory}
              onAddChore={finance.addChore}
              onUpdateChore={finance.updateChore}
              onArchiveChore={finance.archiveChore}
              onUpdateChild={finance.updateChild}
              onLock={() => {
                setParentUnlocked(false)
                setInParentView(false)
              }}
            />
          ) : (
            <PinGate
              settings={finance.settings}
              onSetGate={(parent) => finance.updateSettings({ parent })}
              onUnlock={() => setParentUnlocked(true)}
            />
          )
        ) : openChild ? (
          <ChildScreen
            child={openChild}
            transactions={finance.transactions}
            categories={finance.categories}
            chores={finance.chores}
            settings={finance.settings}
            onGotMoney={() =>
              setSheet({ kind: 'add-transaction', childId: openChild.id, direction: 'in' })
            }
            onSpentMoney={() =>
              setSheet({ kind: 'add-transaction', childId: openChild.id, direction: 'out' })
            }
            onClaimChore={(chore) => void claimChore(chore)}
            onEditTransaction={(transaction) => setSheet({ kind: 'edit-transaction', transaction })}
            onEditChild={() => setSheet({ kind: 'edit-child', childId: openChild.id })}
          />
        ) : (
          <HomeScreen
            children={finance.children}
            transactions={finance.transactions}
            settings={finance.settings}
            onOpenChild={setOpenChildId}
            onAddChild={() => setSheet({ kind: 'add-child' })}
          />
        )}
      </main>

      {sheet.kind === 'add-child' ? (
        <ChildSheet
          onSave={async (fields) => {
            await finance.addChild(fields)
          }}
          onClose={closeSheet}
        />
      ) : null}

      {sheet.kind === 'edit-child' && sheetChild ? (
        <ChildSheet
          existing={sheetChild}
          onSave={(fields) => finance.updateChild(sheetChild.id, fields)}
          onDelete={async () => {
            await finance.removeChild(sheetChild.id)
            setOpenChildId(null)
          }}
          onClose={closeSheet}
        />
      ) : null}

      {sheet.kind === 'add-transaction' && sheetChild ? (
        <TransactionSheet
          child={sheetChild}
          kind={sheet.direction}
          settings={finance.settings}
          allCategories={finance.categories}
          transactions={finance.transactions}
          onSave={(draft) => finance.addTransaction({ ...draft, childId: sheetChild.id })}
          onClose={closeSheet}
        />
      ) : null}

      {sheet.kind === 'edit-transaction' && sheetChild ? (
        <TransactionSheet
          child={sheetChild}
          kind={sheet.transaction.kind}
          existing={sheet.transaction}
          settings={finance.settings}
          allCategories={finance.categories}
          transactions={finance.transactions}
          onSave={(draft) => finance.updateTransaction(sheet.transaction.id, draft)}
          onDelete={() => finance.removeTransaction(sheet.transaction.id)}
          onClose={closeSheet}
        />
      ) : null}

      {sheet.kind === 'settings' ? (
        <SettingsSheet
          settings={finance.settings}
          onUpdate={finance.updateSettings}
          onExport={finance.exportSnapshot}
          onImport={finance.importSnapshot}
          onClose={closeSheet}
        />
      ) : null}
    </div>
  )
}
