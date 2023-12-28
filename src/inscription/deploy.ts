import { addressToScript, blake160, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import {
  FEE,
  MIN_CAPACITY,
  getJoyIDCellDep,
  getInscriptionInfoTypeScript,
  getInscriptionInfoDep,
  getCotaTypeScript,
} from '../constants'
import { SubkeyUnlockReq } from '../types'
import { DeployParams, DeployResult, InscriptionInfo } from '../types/inscription'
import { calcInscriptionInfoSize, calcXudtHash, generateInscriptionId, serializeInscriptionInfo } from './helper'
import { append0x } from '../utils'

// include lock, type, capacity and 1ckb for tx fee
const INSCRIPTION_INFO_MIN_SIZE = 129
const calcInfoCapacity = (info: InscriptionInfo) => {
  return BigInt(INSCRIPTION_INFO_MIN_SIZE + calcInscriptionInfoSize(info)) * BigInt(100000000)
}

export const buildDeployTx = async ({
  collector,
  aggregator,
  address,
  info,
  connectData,
  fee,
}: DeployParams): Promise<DeployResult> => {
  const isMainnet = address.startsWith('ckb')
  const txFee = fee ?? FEE
  const lock = addressToScript(address)
  const cells = await collector.getCells({ lock })
  if (cells == undefined || cells.length == 0) {
    throw new Error('The address has no live cells')
  }

  const infoCapacity = calcInfoCapacity(info)
  const { inputs, capacity: inputCapacity } = collector.collectInputs(cells, infoCapacity, txFee)

  const inscriptionId = generateInscriptionId(inputs[0], 0)

  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: inscriptionId,
  }

  let outputs: CKBComponents.CellOutput[] = [
    {
      capacity: `0x${infoCapacity.toString(16)}`,
      lock,
      type: inscriptionInfoType,
    },
  ]
  const changeCapacity = inputCapacity - txFee - infoCapacity
  if (changeCapacity < MIN_CAPACITY) {
    throw new Error('Not enough capacity for change cell')
  }
  outputs.push({
    capacity: `0x${changeCapacity.toString(16)}`,
    lock,
  })

  let cellDeps = [getJoyIDCellDep(isMainnet), getInscriptionInfoDep(isMainnet)]

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

    const cotaType = getCotaTypeScript(isMainnet)
    const cotaCells = await collector.getCells({ lock, type: cotaType })
    if (!cotaCells || cotaCells.length === 0) {
      throw new Error("Cota cell doesn't exist")
    }
    const cotaCell = cotaCells[0]
    const cotaCellDep: CKBComponents.CellDep = {
      outPoint: cotaCell.outPoint,
      depType: 'code',
    }
    cellDeps = [cotaCellDep, ...cellDeps]
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

  return { rawTx, inscriptionId }
}
