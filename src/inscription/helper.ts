import {
  PERSONAL,
  blake2b,
  bytesToHex,
  hexToBytes,
  scriptToHash,
  serializeInput,
  serializeScript,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils'
import BigNumber from 'bignumber.js'
import { append0x, leToU128, remove0x, u128ToLe, u64ToLe, u8ToHex, utf8ToHex } from '../utils'
import { Byte32, IndexerCell, InscriptionInfo, InscriptionXinsInfo } from '../types'
import {
  getXudtTypeScript,
  getInscriptionTypeScript,
  getRebaseTypeScript,
  MAX_TX_SIZE,
  getXinsTypeScript,
} from '../constants'

export const generateInscriptionId = (firstInput: CKBComponents.CellInput, outputIndex: number) => {
  const input = hexToBytes(serializeInput(firstInput))
  const s = blake2b(32, null, null, PERSONAL)
  s.update(input)
  s.update(hexToBytes(`0x${u64ToLe(BigInt(outputIndex))}`))
  return `0x${s.digest('hex')}`
}

const FIXED_SIZE = 66
export const calcInscriptionInfoSize = (info: InscriptionInfo | InscriptionXinsInfo) => {
  let size = FIXED_SIZE
  const name = remove0x(utf8ToHex(info.name))
  size += name.length / 2 + 1
  const symbol = remove0x(utf8ToHex(info.symbol))
  size += symbol.length / 2 + 1
  return size
}

export const serializeInscriptionInfo = (info: InscriptionInfo) => {
  let ret = u8ToHex(info.decimal)
  const name = remove0x(utf8ToHex(info.name))
  ret = ret.concat(u8ToHex(name.length / 2) + name)
  const symbol = remove0x(utf8ToHex(info.symbol))
  ret = ret.concat(u8ToHex(symbol.length / 2) + symbol)
  ret = ret.concat(remove0x(info.xudtHash))
  ret = ret.concat(u128ToLe(info.maxSupply * BigInt(10 ** info.decimal)))
  ret = ret.concat(u128ToLe(info.mintLimit * BigInt(10 ** info.decimal)))
  ret = ret.concat(u8ToHex(info.mintStatus))
  return ret
}

export const serializeInscriptionXinsInfo = (info: InscriptionXinsInfo) => {
  let ret = u8ToHex(info.decimal)
  const name = remove0x(utf8ToHex(info.name))
  ret = ret.concat(u8ToHex(name.length / 2) + name)
  const symbol = remove0x(utf8ToHex(info.symbol))
  ret = ret.concat(u8ToHex(symbol.length / 2) + symbol)
  ret = ret.concat(remove0x(info.xinsHash))
  ret = ret.concat(u128ToLe(info.maxSupply * BigInt(10 ** info.decimal)))
  ret = ret.concat(u128ToLe(info.mintLimit * BigInt(10 ** info.decimal)))
  ret = ret.concat(u8ToHex(info.mintStatus))
  return ret
}

export const setInscriptionInfoClosed = (info: string) => {
  let temp = hexToBytes(append0x(info))
  // the mintStatus is the last one of cell data and the value will be updated to 1(closed)
  temp[temp.length - 1] = 1
  return append0x(bytesToHex(temp))
}

export const setInscriptionInfoRebased = (info: string, rebasedXudtHash: Byte32) => {
  let temp = hexToBytes(append0x(info))
  // the mintStatus is the last one of cell data and the value will be updated to 2(rebased)
  temp[temp.length - 1] = 2

  // the xudeHash is at data[temp.length - 65, temp.length - 33]
  const rebasedHash = hexToBytes(append0x(rebasedXudtHash))
  const startIndex = temp.length - 65
  const endIndex = temp.length - 33

  const result = new Uint8Array([...temp.subarray(0, startIndex), ...rebasedHash, ...temp.subarray(endIndex)])

  return append0x(bytesToHex(result))
}

export const getXudtHashFromInfo = (info: string) => {
  let temp = hexToBytes(append0x(info))
  // the xudeHash is at data[temp.length - 65, temp.length - 33]
  const startIndex = temp.length - 65
  const endIndex = temp.length - 33
  return bytesToHex(temp.subarray(startIndex, endIndex))
}

export const generateOwnerScript = (inscriptionInfoScript: CKBComponents.Script, isMainnet: boolean) => {
  return {
    ...getInscriptionTypeScript(isMainnet),
    args: append0x(scriptToHash(inscriptionInfoScript)),
  } as CKBComponents.Script
}

export const calcXudtTypeScript = (inscriptionInfoScript: CKBComponents.Script, isMainnet: boolean) => {
  const ownerScript = generateOwnerScript(inscriptionInfoScript, isMainnet)
  return {
    ...getXudtTypeScript(isMainnet),
    args: append0x(scriptToHash(ownerScript)),
  } as CKBComponents.Script
}

export const calcXudtHash = (inscriptionInfoScript: CKBComponents.Script, isMainnet: boolean) => {
  return scriptToHash(calcXudtTypeScript(inscriptionInfoScript, isMainnet))
}

export const calcXinsTypeScript = (inscriptionInfoScript: CKBComponents.Script, isMainnet: boolean) => {
  const ownerScript = generateOwnerScript(inscriptionInfoScript, isMainnet)
  return {
    ...getXinsTypeScript(isMainnet),
    args: append0x(scriptToHash(ownerScript)),
  } as CKBComponents.Script
}

export const calcXinsHash = (inscriptionInfoScript: CKBComponents.Script, isMainnet: boolean) => {
  return scriptToHash(calcXinsTypeScript(inscriptionInfoScript, isMainnet))
}

export const calcRebasedXudtOwnerScript = (
  inscriptionInfoScript: CKBComponents.Script,
  preXudtHash: Byte32,
  actualSupply: bigint,
  isMainnet: boolean,
) => {
  const rebasedOwnerScriptArgs =
    append0x(scriptToHash(inscriptionInfoScript)) + remove0x(preXudtHash) + u128ToLe(actualSupply)
  const rebasedOwnerScript: CKBComponents.Script = {
    ...getRebaseTypeScript(isMainnet),
    args: rebasedOwnerScriptArgs,
  }
  return rebasedOwnerScript
}

export const calcRebasedXudtType = (
  inscriptionInfoScript: CKBComponents.Script,
  preXudtHash: Byte32,
  actualSupply: bigint,
  isMainnet: boolean,
) => {
  const rebasedOwnerScript = calcRebasedXudtOwnerScript(inscriptionInfoScript, preXudtHash, actualSupply, isMainnet)
  const rebasedXudtType: CKBComponents.Script = {
    ...getXudtTypeScript(isMainnet),
    args: append0x(scriptToHash(rebasedOwnerScript)),
  }
  return rebasedXudtType
}

export const calcRebasedXudtHash = (
  inscriptionInfoScript: CKBComponents.Script,
  preXudtHash: Byte32,
  actualSupply: bigint,
  isMainnet: boolean,
) => {
  return scriptToHash(calcRebasedXudtType(inscriptionInfoScript, preXudtHash, actualSupply, isMainnet))
}

export const calcMintXudtWitness = (inscriptionInfoScript: CKBComponents.Script, isMainnet: boolean) => {
  const ownerScript = generateOwnerScript(inscriptionInfoScript, isMainnet)
  const owner = remove0x(serializeScript(ownerScript))
  // serialize mint XudtInputWitness
  const witnessInputType = `0x6d00000014000000690000006900000069000000${owner}04000000`
  const emptyWitness = { lock: '', inputType: '', outputType: witnessInputType }
  return serializeWitnessArgs(emptyWitness)
}

export const calcRebasedXudtWitness = (
  inscriptionInfoScript: CKBComponents.Script,
  preXudtHash: Byte32,
  actualSupply: bigint,
  isMainnet: boolean,
) => {
  const rebasedOwnerScript = calcRebasedXudtOwnerScript(inscriptionInfoScript, preXudtHash, actualSupply, isMainnet)
  const owner = remove0x(serializeScript(rebasedOwnerScript))
  // serialize rebased XudtInputWitness
  const witnessInputType = `0x9d00000014000000990000009900000099000000${owner}04000000`
  const emptyWitness = { lock: '', inputType: '', outputType: witnessInputType }
  return serializeWitnessArgs(emptyWitness)
}

export const calcActualSupply = (xudtCells: IndexerCell[]) => {
  return xudtCells.map(cell => leToU128(cell.outputData)).reduce((prev, current) => prev + current, BigInt(0))
}

export const calculateTransactionFee = (feeRate: bigint, txSize?: number): bigint => {
  const ratio = BigNumber(1000)
  const transactionSize = txSize ?? MAX_TX_SIZE
  const fee = BigNumber(transactionSize).multipliedBy(BigNumber(feeRate.toString())).div(ratio)
  return BigInt(fee.toFixed(0, BigNumber.ROUND_CEIL).toString())
}

const SingleXudtCapacity = 500
const BaseFeeRate = BigInt(1000)
export const calculateRebaseTxFee = (count: number, feeRate?: bigint) => {
  let txSize = 1500
  if (count > 1) {
    txSize += (count - 1) * SingleXudtCapacity
  }
  const rate = feeRate ?? BaseFeeRate
  return calculateTransactionFee(rate, txSize)
}
