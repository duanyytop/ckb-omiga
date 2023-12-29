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

export interface JoyIDConfig {
  aggregator: Aggregator
  connectData: ConnectResponseData
}

interface BaseParams {
  collector: Collector
  address: Address
  fee?: bigint
}

export interface DeployParams extends BaseParams {
  info: InscriptionInfo
  joyID?: JoyIDConfig
}

export interface DeployResult {
  rawTx: CKBComponents.RawTransaction
  inscriptionId: Hex
}

export interface MintParams extends BaseParams {
  inscriptionId: Byte32
  mintLimit: bigint
  joyID?: JoyIDConfig
}

export interface CloseParams extends BaseParams {
  inscriptionId: Byte32
  joyID?: JoyIDConfig
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
  joyID?: JoyIDConfig
}

export interface RebaseMintParams extends BaseParams {
  inscriptionInfo: InscriptionInfo
  inscriptionId: Byte32
  preXudtHash: Byte32
  actualSupply: bigint
  joyID?: JoyIDConfig
}

export interface TransferParams extends BaseParams {
  inscriptionId: Byte32
  toAddress: Address
  cellCount?: number
  joyID?: JoyIDConfig
}
