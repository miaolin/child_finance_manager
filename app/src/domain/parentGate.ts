/**
 * The parent PIN.
 *
 * Be clear about what this is: a door a young child will not wander through.
 * It is not security. The hash sits in the same browser storage as the records
 * it guards, so anyone who can open devtools can clear it. Real separation
 * waits on actual accounts.
 *
 * Even so, the PIN is stored as a salted hash rather than in the clear — a
 * PIN is the kind of thing people reuse elsewhere.
 */

import type { ParentGate } from './types.ts'

export const PIN_LENGTH = 4

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hash(salt: string, pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`)
  return toHex(await crypto.subtle.digest('SHA-256', bytes))
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)
}

export function isPinSet(gate: ParentGate | undefined): boolean {
  return !!gate?.pinHash
}

export async function createGate(pin: string): Promise<ParentGate> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  return { salt, pinHash: await hash(salt, pin) }
}

export async function pinMatches(gate: ParentGate | undefined, pin: string): Promise<boolean> {
  if (!gate?.pinHash || !gate.salt) return false
  return (await hash(gate.salt, pin)) === gate.pinHash
}
