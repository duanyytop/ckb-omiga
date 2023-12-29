import { Byte32, Hex, U128, U8 } from './common'
import { Collector } from '../collector'
import { Address } from '../types'
import { ConnectResponseData } from '@joyid/ckb'
import { Aggregator } from '../aggregator'

export interface InscriptionInfo {
  decimal: U8
  name: string
  symbol: string
  xudtHash: Byte32
  maxSupply: U128
  mintLimit: U128
  mintStatus: U8
}

interface BaseParams {
  collector: Collector
  aggregator: Aggregator
  address: Address
  connectData: ConnectResponseData
  fee?: bigint
}

export interface DeployParams extends BaseParams {
  info: InscriptionInfo
}

export interface DeployResult {
  rawTx: CKBComponents.RawTransaction
  inscriptionId: Hex
}

export interface MintParams extends BaseParams {
  inscriptionId: Byte32
  mintLimit: bigint
}

export interface CloseParams extends BaseParams {
  inscriptionId: Byte32
}

export interface ActualSupplyParams {
  collector: Collector
  inscriptionId: string
  isMainnet: boolean
}

export interface InfoRebaseParams extends BaseParams {
  inscriptionId: Byte32
  preXudtHash: Byte32
  actualSupply: bigint
}

export interface RebaseMintParams extends BaseParams {
  inscriptionInfo: InscriptionInfo
  inscriptionId: Byte32
  preXudtHash: Byte32
  actualSupply: bigint
}

export interface TransferParams extends BaseParams {
  inscriptionId: Byte32
  toAddress: Address
  cellCount?: number
}
