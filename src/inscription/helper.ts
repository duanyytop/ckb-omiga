import {
  PERSONAL,
  blake2b,
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

export const serializeInscriptionInfo = (info: InscriptionInfo) => {
  let ret = u128ToLe(info.maxSupply * BigInt(10 ** info.decimal))
  ret = ret.concat(u128ToLe(info.mintLimit * BigInt(10 ** info.decimal)))
  ret = ret.concat(remove0x(info.xudtHash))
  ret = ret.concat(u8ToHex(info.isMintClosed))
  ret = ret.concat(u8ToHex(info.decimal))
  ret = ret.concat(remove0x(utf8ToHex(info.name)))
  return ret
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
