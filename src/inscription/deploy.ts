import { addressToScript, blake160, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import { FEE, MIN_CAPACITY, getJoyIDCellDep, getInscriptionInfoTypeScript, getInscriptionInfoDep } from '../constants'
import { Collector } from '../collector'
import { Address, SubkeyUnlockReq } from '../types'
import { InscriptionInfo } from '../types/inscription'
import { calcXudtHash, generateInscriptionId, serializeInscriptionInfo } from './helper'
import { append0x, utf8ToHex } from '../utils'
import { ConnectResponseData } from '@joyid/ckb'
import { Aggregator } from '../aggregator'

// 1ckb for tx fee
const INSCRIPTION_INFO_MIN_CAPACITY = BigInt(195) * BigInt(100000000)
export interface DeployParams {
  collector: Collector
  aggregator: Aggregator
  address: Address
  info: InscriptionInfo
  connectData: ConnectResponseData
}
export const buildDeployTx = async ({
  collector,
  aggregator,
  address,
  info,
  connectData,
}: DeployParams): Promise<CKBComponents.RawTransaction> => {
  const isMainnet = address.startsWith('ckb')
  const lock = addressToScript(address)
  const cells = await collector.getCells(lock)
  if (cells == undefined || cells.length == 0) {
    throw new Error('The address has no live cells')
  }

  const infoCapacity = INSCRIPTION_INFO_MIN_CAPACITY + BigInt(utf8ToHex(info.name).length / 2) * BigInt(100000000)
  const { inputs, capacity: inputCapacity } = collector.collectInputs(cells, infoCapacity, FEE)

  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: generateInscriptionId(inputs[0], 0),
  }

  let outputs: CKBComponents.CellOutput[] = [
    {
      capacity: `0x${infoCapacity.toString(16)}`,
      lock,
      type: inscriptionInfoType,
    },
  ]
  const changeCapacity = inputCapacity - FEE - infoCapacity
  if (changeCapacity < MIN_CAPACITY) {
    throw new Error('Not enough capacity for change cell')
  }
  outputs.push({
    capacity: `0x${changeCapacity.toString(16)}`,
    lock,
  })

  const cellDeps = [getJoyIDCellDep(isMainnet), getInscriptionInfoDep(isMainnet)]

  const newInfo: InscriptionInfo = {
    ...info,
    xudtHash: calcXudtHash(inscriptionInfoType, isMainnet),
  }
  const inscriptionInfo = append0x(serializeInscriptionInfo(newInfo))

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  let witnesses = [serializeWitnessArgs(emptyWitness), '0x']
  if (connectData.keyType === 'sub_key') {
    const pubkeyHash = append0x(blake160(append0x(connectData.pubkey), 'hex'))
    const req: SubkeyUnlockReq = {
      lockScript: serializeScript(lock),
      pubkeyHash,
      algIndex: 1, // secp256r1
    }
    const { unlockEntry } = await aggregator.generateSubkeyUnlockSmt(req)
    const emptyWitness = {
      lock: '',
      inputType: '',
      outputType: append0x(unlockEntry),
    }
    witnesses[0] = serializeWitnessArgs(emptyWitness)
  }
  const rawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData: [inscriptionInfo, '0x'],
    witnesses,
  }

  return rawTx
}
