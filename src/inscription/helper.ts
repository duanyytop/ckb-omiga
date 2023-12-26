import { PERSONAL, blake2b, bytesToHex, hexToBytes, scriptToHash, serializeInput } from '@nervosnetwork/ckb-sdk-utils'
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
  let ret = u128ToLe(info.maxSupply)
  ret = ret.concat(u128ToLe(info.mintLimit))
  ret = ret.concat(remove0x(info.xudtHash))
  ret = ret.concat(u8ToHex(info.isMintClosed))
  ret = ret.concat(u8ToHex(info.decimal))
  ret = ret.concat(remove0x(utf8ToHex(info.name)))
  return ret
}

export const calcXudtHash = (inscriptionInfoScript: CKBComponents.Script, isMainnet: boolean) => {
  const ownerScript = {
    ...getInscriptionTypeScript(isMainnet),
    args: append0x(scriptToHash(inscriptionInfoScript)),
  }
  const inscriptionScript = {
    ...getXudtTypeScript(isMainnet),
    args: append0x(scriptToHash(ownerScript)),
  }
  return scriptToHash(inscriptionScript)
}
