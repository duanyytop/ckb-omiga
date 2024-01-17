import { Byte32, Capacity, Hex, U128, U8 } from './common'
import { Collector } from '../collector'
import { Address } from '../types'
import { ConnectResponseData } from '@joyid/ckb'
import { Aggregator } from '../aggregator'

export interface InscriptionXinsInfo {
  decimal: U8
  name: string
  symbol: string
  xinsHash: Byte32
  maxSupply: U128
  mintLimit: U128
  mintStatus: U8
}

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
  feeRate?: bigint
}

export interface DeployParams extends BaseParams {
  info: InscriptionInfo
  joyID?: JoyIDConfig
}

export interface DeployResult {
  rawTx: CKBComponents.RawTransaction
  inscriptionId: Hex
  xudtHash: Byte32
}

export interface DeployXinsResult {
  rawTx: CKBComponents.RawTransaction
  inscriptionId: Hex
  xinsHash: Byte32
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
  actualSupply: bigint
  joyID?: JoyIDConfig
}

export interface RebaseMintParams extends BaseParams {
  inscriptionInfo: InscriptionInfo
  inscriptionId: Byte32
  actualSupply: bigint
  cellCount?: number
  joyID?: JoyIDConfig
}

export interface RebaseMintResult {
  rawTx: CKBComponents.RawTransaction
  rebasedXudtType: CKBComponents.Script
}

export interface TransferParams extends BaseParams {
  inscriptionId: Byte32
  toAddress: Address
  cellCount?: number
  joyID?: JoyIDConfig
}

export interface TransferCKBParams extends BaseParams {
  toAddress: Address
  amount?: Capacity
  joyID?: JoyIDConfig
}

export interface RebasedTransferParams extends BaseParams {
  rebasedXudtType: CKBComponents.Script
  toAddress: Address
  cellCount?: number
  joyID?: JoyIDConfig
}
