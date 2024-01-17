import {
  addressToScript,
  blake160,
  hexToBytes,
  scriptToHash,
  serializeScript,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils'
import BigNumber from 'bignumber.js'
import {
  FEE,
  getJoyIDCellDep,
  getInscriptionInfoTypeScript,
  getInscriptionInfoDep,
  getCotaTypeScript,
  getXudtDep,
  getRebaseDep,
  getXinsDep,
} from '../constants'
import {
  ActualSupplyParams,
  Address,
  InfoRebaseParams,
  RebaseMintParams,
  RebaseMintResult,
  SubkeyUnlockReq,
} from '../types'
import {
  calcActualSupply,
  calcRebasedXudtHash,
  calcRebasedXudtType,
  calcXudtTypeScript,
  setInscriptionInfoRebased,
  calcRebasedXudtWitness,
  calculateTransactionFee,
  calculateRebaseTxFee,
  getXudtHashFromInfo,
  calcXinsTypeScript,
} from './helper'
import { append0x, leToU128, u128ToLe } from '../utils'
import { calcXudtCapacity } from './mint'
import {
  InscriptionInfoException,
  InscriptionXudtException,
  NoCotaCellException,
  NoLiveCellException,
} from '../exceptions'

export const calcInscriptionActualSupply = async ({ collector, inscriptionId, isMainnet }: ActualSupplyParams) => {
  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const preXudtType = calcXudtTypeScript(inscriptionInfoType, isMainnet)
  const preXudtCells = await collector.getCells({ type: preXudtType })
  if (!preXudtCells || preXudtCells.length === 0) {
    throw new InscriptionInfoException('Cannot find any previous xudt cell with the given inscription id')
  }
  const actualSupply = calcActualSupply(preXudtCells)
  return actualSupply
}

export const calcInscriptionXinsActualSupply = async ({ collector, inscriptionId, isMainnet }: ActualSupplyParams) => {
  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const preXinsType = calcXinsTypeScript(inscriptionInfoType, isMainnet)
  const preXinsCells = await collector.getCells({ type: preXinsType })
  if (!preXinsCells || preXinsCells.length === 0) {
    throw new InscriptionInfoException('Cannot find any previous xudt cell with the given inscription id')
  }
  const actualSupply = calcActualSupply(preXinsCells)
  return actualSupply
}

export const buildInfoRebaseTx = async ({
  collector,
  joyID,
  address,
  inscriptionId,
  actualSupply,
  feeRate,
}: InfoRebaseParams): Promise<CKBComponents.RawTransaction> => {
  const txFee = feeRate ? calculateTransactionFee(feeRate) : FEE
  const isMainnet = address.startsWith('ckb')
  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const lock = addressToScript(address)
  const inscriptionInfoCells = await collector.getCells({ type: inscriptionInfoType })
  if (!inscriptionInfoCells || inscriptionInfoCells.length === 0) {
    throw new InscriptionInfoException('There is no inscription info cell with the given inscription id')
  }
  const inputs: CKBComponents.CellInput[] = [
    {
      previousOutput: inscriptionInfoCells[0].outPoint,
      since: '0x0',
    },
  ]

  const outputCapacity = BigInt(append0x(inscriptionInfoCells[0].output.capacity)) - txFee
  const outputs: CKBComponents.CellOutput[] = [
    {
      ...inscriptionInfoCells[0].output,
      capacity: `0x${outputCapacity.toString(16)}`,
    },
  ]

  let cellDeps = [getJoyIDCellDep(isMainnet), getInscriptionInfoDep(isMainnet)]

  const preXudtHash = getXudtHashFromInfo(inscriptionInfoCells[0].outputData)
  const rebasedXudtHash = calcRebasedXudtHash(inscriptionInfoType, preXudtHash, actualSupply, isMainnet)
  const inscriptionInfo = setInscriptionInfoRebased(inscriptionInfoCells[0].outputData, rebasedXudtHash)

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  let witnesses = [serializeWitnessArgs(emptyWitness)]
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
    outputsData: [inscriptionInfo],
    witnesses,
  }

  return rawTx
}

export const calcSingleRebaseMintCapacity = (
  address: Address,
): { rebasedXudtCapacity: bigint; minChangeCapacity: bigint } => {
  const rebasedXudtCapacity = calcXudtCapacity(address)

  const lock = addressToScript(address)
  const argsSize = hexToBytes(lock.args).length
  const lockSize = 32 + 1 + argsSize
  const capacitySize = 8
  const minChangeCapacity = BigInt(lockSize + capacitySize) * BigInt(10000_0000)

  return { rebasedXudtCapacity, minChangeCapacity }
}

export const buildRebaseMintTx = async ({
  collector,
  joyID,
  address,
  inscriptionId,
  inscriptionInfo,
  actualSupply,
  cellCount,
  feeRate,
}: RebaseMintParams): Promise<RebaseMintResult> => {
  const isMainnet = address.startsWith('ckb')
  const lock = addressToScript(address)
  const { minChangeCapacity } = calcSingleRebaseMintCapacity(address)

  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const xudtType = calcXudtTypeScript(inscriptionInfoType, isMainnet)
  const preXudtHash = scriptToHash(xudtType)
  const xudtCells = await collector.getCells({ lock, type: xudtType })
  if (!xudtCells || xudtCells.length === 0) {
    throw new InscriptionXudtException('The address has no inscription cells and please mint first')
  }
  const xudtCellCount = cellCount && cellCount > 0 ? Math.min(xudtCells.length, cellCount) : xudtCells.length
  const txFee = calculateRebaseTxFee(xudtCellCount, feeRate)

  const cells = await collector.getCells({ lock })
  if (!cells || cells.length === 0) {
    throw new NoLiveCellException('The address has no live cells')
  }
  let { inputs, capacity: inputCapacity } = collector.collectInputs(cells, minChangeCapacity, txFee)
  const xudtInputs = xudtCells.slice(0, cellCount).map(cell => ({ previousOutput: cell.outPoint, since: '0x0' }))
  inputs = [...xudtInputs, ...inputs]

  const inscriptionInfoCells = await collector.getCells({ type: inscriptionInfoType })
  if (!inscriptionInfoCells || inscriptionInfoCells.length === 0) {
    throw new InscriptionInfoException('There is no inscription info cell with the given inscription id')
  }
  const inscriptionInfoCellDep: CKBComponents.CellDep = {
    outPoint: inscriptionInfoCells[0].outPoint,
    depType: 'code',
  }
  let cellDeps = [getJoyIDCellDep(isMainnet), getXudtDep(isMainnet), getRebaseDep(isMainnet), inscriptionInfoCellDep]

  const rebasedXudtType = calcRebasedXudtType(inscriptionInfoType, preXudtHash, actualSupply, isMainnet)

  const xudtOutputs = xudtCells.slice(0, cellCount).map(cell => ({
    ...cell.output,
    type: rebasedXudtType,
  }))
  const changeCapacity = inputCapacity - txFee
  let outputs: CKBComponents.CellOutput[] = [
    {
      capacity: `0x${changeCapacity.toString(16)}`,
      lock,
    },
    ...xudtOutputs,
  ]

  const exceptedSupply = inscriptionInfo.maxSupply * BigInt(10 ** inscriptionInfo.decimal)

  let preTotalAmount = BigInt(0)
  xudtCells.slice(0, cellCount).forEach(cell => {
    const preAmount = leToU128(cell.outputData)
    preTotalAmount = preTotalAmount + preAmount
  })

  const expectedTotalAmount_ = BigNumber((preTotalAmount * exceptedSupply).toString(), 10)
  const actualTotalAmount_ = expectedTotalAmount_
    .dividedBy(BigNumber(actualSupply.toString(), 10))
    .toFixed(0, BigNumber.ROUND_FLOOR)
  const actualTotalAmount = BigInt(actualTotalAmount_)

  const actualAmount = actualTotalAmount / BigInt(xudtCellCount)
  const remainder = actualTotalAmount % BigInt(xudtCellCount)
  let xudt_output_index = 0
  const rebasedXudtCellDataList = xudtCells.slice(0, cellCount).map(_cell => {
    xudt_output_index += 1
    if (xudt_output_index == xudtCellCount) {
      return append0x(u128ToLe(actualAmount + remainder))
    }
    return append0x(u128ToLe(actualAmount))
  })

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  let witnesses = [
    serializeWitnessArgs(emptyWitness),
    calcRebasedXudtWitness(inscriptionInfoType, preXudtHash, actualSupply, isMainnet),
  ]
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
    outputsData: ['0x', ...rebasedXudtCellDataList],
    witnesses,
  }

  return { rawTx, rebasedXudtType }
}

export const buildRebaseMintXinsTx = async ({
  collector,
  joyID,
  address,
  inscriptionId,
  inscriptionInfo,
  actualSupply,
  cellCount,
  feeRate,
}: RebaseMintParams): Promise<RebaseMintResult> => {
  const isMainnet = address.startsWith('ckb')
  const lock = addressToScript(address)
  const { minChangeCapacity } = calcSingleRebaseMintCapacity(address)

  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const xinsType = calcXinsTypeScript(inscriptionInfoType, isMainnet)
  const preXinsHash = scriptToHash(xinsType)
  const xinsCells = await collector.getCells({ lock, type: xinsType })
  if (!xinsCells || xinsCells.length === 0) {
    throw new InscriptionXudtException('The address has no inscription cells and please mint first')
  }
  const xinsCellCount = cellCount && cellCount > 0 ? Math.min(xinsCells.length, cellCount) : xinsCells.length
  const txFee = calculateRebaseTxFee(xinsCellCount, feeRate)

  const cells = await collector.getCells({ lock })
  if (!cells || cells.length === 0) {
    throw new NoLiveCellException('The address has no live cells')
  }
  let { inputs, capacity: inputCapacity } = collector.collectInputs(cells, minChangeCapacity, txFee)
  const xinsInputs = xinsCells.slice(0, cellCount).map(cell => ({ previousOutput: cell.outPoint, since: '0x0' }))
  inputs = [...xinsInputs, ...inputs]

  const inscriptionInfoCells = await collector.getCells({ type: inscriptionInfoType })
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
    getXinsDep(isMainnet),
    getRebaseDep(isMainnet),
    inscriptionInfoCellDep,
  ]

  const rebasedXudtType = calcRebasedXudtType(inscriptionInfoType, preXinsHash, actualSupply, isMainnet)

  const xudtOutputs = xinsCells.slice(0, cellCount).map(cell => ({
    ...cell.output,
    type: rebasedXudtType,
  }))
  const changeCapacity = inputCapacity - txFee
  let outputs: CKBComponents.CellOutput[] = [
    {
      capacity: `0x${changeCapacity.toString(16)}`,
      lock,
    },
    ...xudtOutputs,
  ]

  const exceptedSupply = inscriptionInfo.maxSupply * BigInt(10 ** inscriptionInfo.decimal)

  let preTotalAmount = BigInt(0)
  xinsCells.slice(0, cellCount).forEach(cell => {
    const preAmount = leToU128(cell.outputData)
    preTotalAmount = preTotalAmount + preAmount
  })

  const expectedTotalAmount_ = BigNumber((preTotalAmount * exceptedSupply).toString(), 10)
  const actualTotalAmount_ = expectedTotalAmount_
    .dividedBy(BigNumber(actualSupply.toString(), 10))
    .toFixed(0, BigNumber.ROUND_FLOOR)
  const actualTotalAmount = BigInt(actualTotalAmount_)

  const actualAmount = actualTotalAmount / BigInt(xinsCellCount)
  const remainder = actualTotalAmount % BigInt(xinsCellCount)
  let xudt_output_index = 0
  const rebasedXudtCellDataList = xinsCells.slice(0, cellCount).map(_cell => {
    xudt_output_index += 1
    if (xudt_output_index == xinsCellCount) {
      return append0x(u128ToLe(actualAmount + remainder))
    }
    return append0x(u128ToLe(actualAmount))
  })

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  let witnesses = [
    serializeWitnessArgs(emptyWitness),
    calcRebasedXudtWitness(inscriptionInfoType, preXinsHash, actualSupply, isMainnet),
  ]
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
    outputsData: ['0x', ...rebasedXudtCellDataList],
    witnesses,
  }

  return { rawTx, rebasedXudtType }
}
