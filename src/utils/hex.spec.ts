import { describe, it, expect } from 'vitest'
import { u128ToLe, u32ToLe, u64ToLe } from './hex'

describe('number to little endian', () => {
  it('u32toLe', async () => {
    const expected = u32ToLe(21000000)
    expect('406f4001').toBe(expected)
  })

  it('u64ToLe', async () => {
    const expected = u64ToLe(BigInt(21000000))
    expect('406f400100000000').toBe(expected)
  })

  it('u128ToLe', async () => {
    const expected = u128ToLe(BigInt(21000000))
    expect('406f4001000000000000000000000000').toBe(expected)
  })
})
