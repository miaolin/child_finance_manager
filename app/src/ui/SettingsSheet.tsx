import { useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Settings, Snapshot } from '../domain/types.ts'
import type { SyncStatus } from '../sync/SyncingRepo.ts'
import { Button, Field, Notice, Sheet } from './components.tsx'
import { SyncPanel } from './SyncPanel.tsx'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'CAD', 'AUD', 'SGD']

export function SettingsSheet({
  settings,
  onUpdate,
  onExport,
  onImport,
  onClose,
  cloudConfigured,
  session,
  syncStatus,
  onSyncNow,
}: {
  settings: Settings
  onUpdate: (edits: Partial<Settings>) => Promise<void>
  onExport: () => Promise<Snapshot>
  onImport: (snapshot: Snapshot) => Promise<void>
  onClose: () => void
  cloudConfigured: boolean
  session: Session | null
  syncStatus: SyncStatus | null
  onSyncNow: () => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function download() {
    const snapshot = await onExport()
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pocket-money-${snapshot.exportedAt.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function readFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as Snapshot
      await onImport(parsed)
      setMessage('Loaded. Everything on this device was replaced with that file.')
    } catch {
      setMessage('That file could not be read. Pick a backup this app saved.')
    }
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="txform">
        <Field label="Currency">
          <select
            className="input"
            value={settings.currency}
            onChange={(event) => void onUpdate({ currency: event.target.value })}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </Field>

        {cloudConfigured ? (
          <SyncPanel session={session} status={syncStatus} onSyncNow={onSyncNow} />
        ) : null}

        <div className="backup">
          <h3>Backup</h3>
          <p className="backup__text">
            {session
              ? 'A backup file is a copy you hold yourself, separate from the cloud.'
              : "This app keeps everything in this browser on this device. Clearing the browser's site data erases it, so save a copy somewhere safe."}
          </p>
          <div className="backup__actions">
            <Button onClick={() => void download()}>Save a backup file</Button>
            <Button tone="quiet" onClick={() => fileInput.current?.click()}>
              Load a backup file
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void readFile(file)
              event.target.value = ''
            }}
          />
          {message ? <Notice>{message}</Notice> : null}
        </div>
      </div>
    </Sheet>
  )
}
