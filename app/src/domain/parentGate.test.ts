import { describe, expect, it } from 'vitest'
import { createGate, isPinSet, isValidPin, pinMatches } from './parentGate.ts'

describe('parent PIN', () => {
  it('accepts only four digits', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    expect(isValidPin('')).toBe(false)
  })

  it('knows whether a PIN has been set', () => {
    expect(isPinSet(undefined)).toBe(false)
    expect(isPinSet({})).toBe(false)
  })

  it('never stores the PIN itself', async () => {
    const gate = await createGate('1234')
    expect(JSON.stringify(gate)).not.toContain('1234')
    expect(isPinSet(gate)).toBe(true)
  })

  it('matches the right PIN and rejects the wrong one', async () => {
    const gate = await createGate('1234')
    expect(await pinMatches(gate, '1234')).toBe(true)
    expect(await pinMatches(gate, '4321')).toBe(false)
  })

  it('gives two identical PINs different hashes, so one does not reveal the other', async () => {
    const a = await createGate('1234')
    const b = await createGate('1234')
    expect(a.pinHash).not.toBe(b.pinHash)
  })

  it('rejects everything when no PIN is set', async () => {
    expect(await pinMatches(undefined, '1234')).toBe(false)
  })
})
