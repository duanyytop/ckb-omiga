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
import { append0x, remove0x, u128ToLe, u64ToLe, u8ToHex, utf8ToHex } from '../utils'
import { InscriptionInfo } from '../types'
import { getXudtTypeScript, getInscriptionTypeScript } from '../constants'

export const generateInscriptionId = (firstInput: CKBComponents.CellInput, outputIndex: number) => {
  const input = hexToBytes(serializeInput(firstInput))
  const s = blake2b(32, null, null, PERSONAL)
  s.update(input)
  s.update(hexToBytes(`0x${u64ToLe(BigInt(outputIndex))}`))
  return `0x${s.digest('hex')}`
}

const FIXED_SIZE = 66
export const calcInscriptionInfoSize = (info: InscriptionInfo) => {
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

export const setInscriptionInfoClosed = (info: string) => {
  let temp = hexToBytes(append0x(info))
  // the mintStatus is the last one of cell data and the value will be updated to 1(closed)
  temp[temp.length - 1] = 1
  return append0x(bytesToHex(temp))
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

export const calcXudtWitness = (inscriptionInfoScript: CKBComponents.Script, isMainnet: boolean) => {
  const ownerScript = generateOwnerScript(inscriptionInfoScript, isMainnet)
  const owner = remove0x(serializeScript(ownerScript))
  const witnessInputType = `0x6d00000014000000690000006900000069000000${owner}04000000`
  const emptyWitness = { lock: '', inputType: '', outputType: witnessInputType }
  return serializeWitnessArgs(emptyWitness)
}
