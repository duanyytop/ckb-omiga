import {
  addressToScript,
  blake160,
  hexToBytes,
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

export const buildInfoRebaseTx = async ({
  collector,
  joyID,
  address,
  inscriptionId,
  preXudtHash,
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

export const calcRebaseMintCapacity = (
  address: Address,
): { rebasedXudtCapacity: bigint; minChangeCapacity: bigint } => {
  const rebasedXudtCapacity = calcXudtCapacity(address)

  const lock = addressToScript(address)
  const argsSize = hexToBytes(lock.args).length
  const lockSize = 32 + 1 + argsSize
  const capacitySize = 8
  const minChangeCapacity = BigInt(lockSize + capacitySize) * BigInt(100000000)

  return { rebasedXudtCapacity, minChangeCapacity }
}
export const buildRebaseMintTx = async ({
  collector,
  joyID,
  address,
  inscriptionId,
  inscriptionInfo,
  preXudtHash,
  actualSupply,
  feeRate,
}: RebaseMintParams): Promise<RebaseMintResult> => {
  const isMainnet = address.startsWith('ckb')
  const txFee = feeRate ? calculateTransactionFee(feeRate) : FEE
  const lock = addressToScript(address)

  const { minChangeCapacity } = calcRebaseMintCapacity(address)

  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const xudtType = calcXudtTypeScript(inscriptionInfoType, isMainnet)
  const xudtCells = await collector.getCells({ lock, type: xudtType })
  if (!xudtCells || xudtCells.length === 0) {
    throw new InscriptionXudtException('The address has no inscription cells and please mint first')
  }
  const cells = await collector.getCells({ lock })
  if (cells == undefined || cells.length == 0) {
    throw new NoLiveCellException('The address has no live cells')
  }
  let { inputs, capacity: inputCapacity } = collector.collectInputs(cells, minChangeCapacity, txFee)
  inputs = [{ previousOutput: xudtCells[0].outPoint, since: '0x0' }, ...inputs]

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

  const changeCapacity = inputCapacity - txFee
  let outputs: CKBComponents.CellOutput[] = [
    {
      capacity: `0x${changeCapacity.toString(16)}`,
      lock,
    },
    {
      ...xudtCells[0].output,
      type: rebasedXudtType,
    },
  ]

  const exceptedSupply = inscriptionInfo.maxSupply * BigInt(10 ** inscriptionInfo.decimal)
  const preAmount = leToU128(xudtCells[0].outputData)

  const expectedAmount = BigNumber((preAmount * exceptedSupply).toString(), 10)
  const actualAmount = expectedAmount.dividedBy(BigNumber(actualSupply.toString(), 10)).toFixed(0)
  const rebasedXudtCellData = append0x(u128ToLe(BigInt(actualAmount)))

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
    outputsData: ['0x', rebasedXudtCellData],
    witnesses,
  }

  return { rawTx, rebasedXudtType }
}
