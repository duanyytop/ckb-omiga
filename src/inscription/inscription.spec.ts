import { describe, it, expect } from 'vitest'
import { calcXudtCapacity } from './mint'
import { calcInscriptionInfoCapacity } from './deploy'
import { InscriptionInfo } from '../types'
import { calcRebaseMintCapacity } from './rebase'

describe('inscription test cases', () => {
  it('calcXudtCapacity with JoyID lock', async () => {
    const expected = calcXudtCapacity(
      'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9sfrkfah2cj79nyp7e6p283ualq8779rscnjmrj',
    )
    expect(BigInt(14500000000)).toBe(expected)
  })

  it('calcXudtCapacity with Secp256k1 lock', async () => {
    const expected = calcXudtCapacity(
      'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqdelcxw9t8sa5q695g65eer5awxvtg0nhsk4ahkx',
    )
    expect(BigInt(14300000000)).toBe(expected)
  })

  it('calcInscriptionInfoCapacity with JoyID lock', async () => {
    const info: InscriptionInfo = {
      maxSupply: BigInt(2100_0000),
      mintLimit: BigInt(1000),
      xudtHash: '',
      mintStatus: 0,
      decimal: 8,
      name: 'CKB Fist Inscription',
      symbol: 'CKBI',
    }
    const expected = calcInscriptionInfoCapacity(
      'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9sfrkfah2cj79nyp7e6p283ualq8779rscnjmrj',
      info,
    )
    expect(BigInt(22100000000)).toBe(expected)
  })

  it('calcRebaseMintCapacity with JoyID lock', async () => {
    const { rebasedXudtCapacity, minChangeCapacity } = calcRebaseMintCapacity(
      'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9sfrkfah2cj79nyp7e6p283ualq8779rscnjmrj',
    )
    expect(BigInt(14500000000)).toBe(rebasedXudtCapacity)
    expect(BigInt(6300000000)).toBe(minChangeCapacity)
  })
})
