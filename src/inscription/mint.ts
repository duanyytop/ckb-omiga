import {
  addressToScript,
  blake160,
  hexToBytes,
  serializeScript,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils'
import {
  FEE,
  MIN_CAPACITY,
  getJoyIDCellDep,
  getXudtDep,
  getInscriptionDep,
  getCotaTypeScript,
  getInscriptionInfoTypeScript,
  getXinsDep,
} from '../constants'
import { Address, MintParams, SubkeyUnlockReq } from '../types'
import { calcXudtTypeScript, calcMintXudtWitness, calculateTransactionFee, calcXinsTypeScript } from './helper'
import { append0x, u128ToLe } from '../utils'
import {
  CapacityNotEnoughException,
  InscriptionInfoException,
  NoCotaCellException,
  NoLiveCellException,
} from '../exceptions'

// include lock, xudt type, capacity and 1ckb for tx fee
export const calcXudtCapacity = (address: Address): bigint => {
  const lock = addressToScript(address)
  const argsSize = hexToBytes(lock.args).length
  const lockSize = 32 + 1 + argsSize
  const xudtTypeSize = 32 + 32 + 1
  const capacitySize = 8
  const xudtDataSize = 16
  const cellSize = lockSize + xudtTypeSize + capacitySize + xudtDataSize + 1
  return BigInt(cellSize) * BigInt(10000_0000)
}

export const buildMintTx = async ({
  collector,
  joyID,
  address,
  inscriptionId,
  mintLimit,
  feeRate,
}: MintParams): Promise<CKBComponents.RawTransaction> => {
  const isMainnet = address.startsWith('ckb')
  const txFee = feeRate ? calculateTransactionFee(feeRate) : FEE
  const lock = addressToScript(address)
  const cells = await collector.getCells({ lock })
  if (!cells || cells.length === 0) {
    throw new NoLiveCellException('The address has no live cells')
  }

  const xudtCapacity = calcXudtCapacity(address)
  const { inputs, capacity: inputCapacity } = collector.collectInputs(cells, xudtCapacity, txFee)

  const infoType: CKBComponents.Script = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const xudtType = calcXudtTypeScript(infoType, isMainnet)

  const inscriptionInfoCells = await collector.getCells({ type: infoType })
  if (!inscriptionInfoCells || inscriptionInfoCells.length === 0) {
    throw new InscriptionInfoException('There is no inscription info cell with the given inscription id')
  }
  const inscriptionInfoCellDep: CKBComponents.CellDep = {
    outPoint: inscriptionInfoCells[0].outPoint,
    depType: 'code',
  }
  let cellDeps = [
    getJoyIDCellDep(isMainnet),
    getXudtDep(isMainnet),
    getInscriptionDep(isMainnet),
    inscriptionInfoCellDep,
  ]

  const changeCapacity = inputCapacity - txFee - xudtCapacity
  if (changeCapacity < MIN_CAPACITY) {
    throw new CapacityNotEnoughException('Not enough capacity for change cell')
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
  outputs.push({ capacity: `0x${xudtCapacity.toString(16)}`, lock, type: xudtType })
  outputsData.push(append0x(u128ToLe(mintLimit)))

  if (joyID && joyID.connectData.keyType === 'sub_key') {
    const pubkeyHash = append0x(blake160(append0x(joyID.connectData.pubkey), 'hex'))
    const req: SubkeyUnlockReq = {
      lockScript: serializeScript(lock),
      pubkeyHash,
      algIndex: 1, // secp256r1
    }
    const { unlockEntry } = await joyID.aggregator.generateSubkeyUnlockSmt(req)
    const emptyWitness = {
      lock: '',
      inputType: '',
      outputType: append0x(unlockEntry),
    }
    witnesses[0] = serializeWitnessArgs(emptyWitness)

    const cotaType = getCotaTypeScript(isMainnet)
    const cotaCells = await collector.getCells({ lock, type: cotaType })
    if (!cotaCells || cotaCells.length === 0) {
      throw new NoCotaCellException("Cota cell doesn't exist")
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

export const buildMintXinsTx = async ({
  collector,
  joyID,
  address,
  inscriptionId,
  mintLimit,
  feeRate,
}: MintParams): Promise<CKBComponents.RawTransaction> => {
  const isMainnet = address.startsWith('ckb')
  const txFee = feeRate ? calculateTransactionFee(feeRate) : FEE
  const lock = addressToScript(address)
  const cells = await collector.getCells({ lock })
  if (!cells || cells.length === 0) {
    throw new NoLiveCellException('The address has no live cells')
  }

  const xinsCapacity = calcXudtCapacity(address)
  const { inputs, capacity: inputCapacity } = collector.collectInputs(cells, xinsCapacity, txFee)

  const infoType: CKBComponents.Script = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const xinsType = calcXinsTypeScript(infoType, isMainnet)

  const inscriptionInfoCells = await collector.getCells({ type: infoType })
  if (!inscriptionInfoCells || inscriptionInfoCells.length === 0) {
    throw new InscriptionInfoException('There is no inscription info cell with the given inscription id')
  }
  const inscriptionInfoCellDep: CKBComponents.CellDep = {
    outPoint: inscriptionInfoCells[0].outPoint,
    depType: 'code',
  }
  let cellDeps = [
    getJoyIDCellDep(isMainnet),
    getXinsDep(isMainnet),
    getInscriptionDep(isMainnet),
    inscriptionInfoCellDep,
  ]

  const changeCapacity = inputCapacity - txFee - xinsCapacity
  if (changeCapacity < MIN_CAPACITY) {
    throw new CapacityNotEnoughException('Not enough capacity for change cell')
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
  outputs.push({ capacity: `0x${xinsCapacity.toString(16)}`, lock, type: xinsType })
  outputsData.push(append0x(u128ToLe(mintLimit)))

  if (joyID && joyID.connectData.keyType === 'sub_key') {
    const pubkeyHash = append0x(blake160(append0x(joyID.connectData.pubkey), 'hex'))
    const req: SubkeyUnlockReq = {
      lockScript: serializeScript(lock),
      pubkeyHash,
      algIndex: 1, // secp256r1
    }
    const { unlockEntry } = await joyID.aggregator.generateSubkeyUnlockSmt(req)
    const emptyWitness = {
      lock: '',
      inputType: '',
      outputType: append0x(unlockEntry),
    }
    witnesses[0] = serializeWitnessArgs(emptyWitness)

    const cotaType = getCotaTypeScript(isMainnet)
    const cotaCells = await collector.getCells({ lock, type: cotaType })
    if (!cotaCells || cotaCells.length === 0) {
      throw new NoCotaCellException("Cota cell doesn't exist")
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
