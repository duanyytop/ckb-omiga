import { Byte32, U128, U8 } from './common'

export interface InscriptionInfo {
  decimal: U8
  name: string
  symbol: string
  xudtHash: Byte32
  maxSupply: U128
  mintLimit: U128
  mintStatus: U8
}
