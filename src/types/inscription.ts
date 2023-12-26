import { Byte32, U128, U8 } from './common'

export interface InscriptionInfo {
  maxSupply: U128
  mintLimit: U128
  xudtHash: Byte32
  isMintClosed: U8
  decimal: U8
  name: string
}
