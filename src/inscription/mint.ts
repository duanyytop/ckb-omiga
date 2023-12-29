import { addressToScript, blake160, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import {
  FEE,
  MIN_CAPACITY,
  getJoyIDCellDep,
  getXudtDep,
  getInscriptionDep,
  getCotaTypeScript,
  getInscriptionInfoTypeScript,
} from '../constants'
import { MintParams, SubkeyUnlockReq } from '../types'
import { calcXudtTypeScript, calcMintXudtWitness } from './helper'
import { append0x, u128ToLe } from '../utils'

// 1ckb for tx fee
const XUDT_MIN_CAPACITY = BigInt(145) * BigInt(100000000)

export const buildMintTx = async ({
  collector,
  aggregator,
  address,
  inscriptionId,
  mintLimit,
  connectData,
  cellCount,
  fee,
}: MintParams): Promise<CKBComponents.RawTransaction> => {
  const isMainnet = address.startsWith('ckb')
  const txFee = fee ?? FEE
  const lock = addressToScript(address)
  const cells = await collector.getCells({ lock })
  if (cells == undefined || cells.length == 0) {
    throw new Error('The address has no live cells')
  }
  const count = cellCount ?? 1

  const { inputs, capacity: inputCapacity } = collector.collectInputs(cells, XUDT_MIN_CAPACITY * BigInt(count), txFee)

  const infoType: CKBComponents.Script = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const xudtType = calcXudtTypeScript(infoType, isMainnet)

  const [inscriptionInfoCell] = await collector.getCells({ lock, type: infoType })
  if (!inscriptionInfoCell) {
    throw new Error('The address has no inscription info cells')
  }
  const inscriptionInfoCellDep: CKBComponents.CellDep = {
    outPoint: inscriptionInfoCell.outPoint,
    depType: 'code',
  }
  let cellDeps = [
    getJoyIDCellDep(isMainnet),
    getXudtDep(isMainnet),
    getInscriptionDep(isMainnet),
    inscriptionInfoCellDep,
  ]

  const changeCapacity = inputCapacity - txFee - XUDT_MIN_CAPACITY * BigInt(count)
  if (changeCapacity < MIN_CAPACITY) {
    throw new Error('Not enough capacity for change cell')
  }
  let outputsData = ['0x']
  let outputs: CKBComponents.CellOutput[] = [
    {
      capacity: `0x${changeCapacity.toString(16)}`,
      lock,
    },
  ]
  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  let witnesses = [serializeWitnessArgs(emptyWitness), calcMintXudtWitness(infoType, isMainnet)]
  for (let index = 0; index < count; index++) {
    outputs.push({ capacity: `0x${XUDT_MIN_CAPACITY.toString(16)}`, lock, type: xudtType })
    outputsData.push(append0x(u128ToLe(mintLimit)))
  }

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
    outputsData,
    witnesses,
  }

  return rawTx
}
