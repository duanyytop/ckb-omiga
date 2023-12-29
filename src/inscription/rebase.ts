import { addressToScript, blake160, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import BigNumber from 'bignumber.js'
import {
  FEE,
  getJoyIDCellDep,
  getInscriptionInfoTypeScript,
  getInscriptionInfoDep,
  getCotaTypeScript,
  MIN_CAPACITY,
  getXudtDep,
  getInscriptionDep,
  getRebaseDep,
} from '../constants'
import { InfoRebaseParams, RebaseMintParams, SubkeyUnlockReq } from '../types'
import {
  calcActualSupply,
  calcRebasedXudtHash,
  calcRebasedXudtType,
  calcXudtTypeScript,
  calcMintXudtWitness,
  setInscriptionInfoRebased,
  calcRebasedXudtWitness,
} from './helper'
import { append0x, leToU128, u128ToLe } from '../utils'

export const buildInfoRebaseTx = async ({
  collector,
  aggregator,
  address,
  inscriptionId,
  preXudtHash,
  connectData,
  fee,
}: InfoRebaseParams): Promise<CKBComponents.RawTransaction> => {
  const txFee = fee ?? FEE
  const isMainnet = address.startsWith('ckb')
  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const lock = addressToScript(address)
  const [inscriptionInfoCell] = await collector.getCells({ lock, type: inscriptionInfoType })
  if (!inscriptionInfoCell) {
    throw new Error('The address has no inscription info cells')
  }
  const inputs: CKBComponents.CellInput[] = [
    {
      previousOutput: inscriptionInfoCell.outPoint,
      since: '0x0',
    },
  ]

  const outputCapacity = BigInt(append0x(inscriptionInfoCell.output.capacity)) - txFee
  const outputs: CKBComponents.CellOutput[] = [
    {
      ...inscriptionInfoCell.output,
      capacity: `0x${outputCapacity.toString(16)}`,
    },
  ]

  let cellDeps = [getJoyIDCellDep(isMainnet), getInscriptionInfoDep(isMainnet)]

  const preXudtType = calcXudtTypeScript(inscriptionInfoType, isMainnet)
  const preXudtCells = await collector.getCells({ type: preXudtType })
  const actualSupply = calcActualSupply(preXudtCells)
  const rebasedXudtHash = calcRebasedXudtHash(inscriptionInfoType, preXudtHash, actualSupply, isMainnet)
  const inscriptionInfo = setInscriptionInfoRebased(inscriptionInfoCell.outputData, rebasedXudtHash)

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  let witnesses = [serializeWitnessArgs(emptyWitness)]
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
    outputsData: [inscriptionInfo],
    witnesses,
  }

  return rawTx
}

export const buildRebaseMintTx = async ({
  collector,
  aggregator,
  address,
  inscriptionId,
  inscriptionInfo,
  preXudtHash,
  connectData,
  fee,
}: RebaseMintParams): Promise<CKBComponents.RawTransaction> => {
  const isMainnet = address.startsWith('ckb')
  const txFee = fee ?? FEE
  const lock = addressToScript(address)

  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const xudtType = calcXudtTypeScript(inscriptionInfoType, isMainnet)
  const [xudtCell] = await collector.getCells({ lock, type: xudtType })
  if (!xudtCell) {
    throw new Error('The address has no inscription cells and please mint first')
  }
  const cells = await collector.getCells({ lock })
  if (cells == undefined || cells.length == 0) {
    throw new Error('The address has no live cells')
  }
  let { inputs, capacity: inputCapacity } = collector.collectInputs(cells, MIN_CAPACITY, txFee)
  inputs = [{ previousOutput: xudtCell.outPoint, since: '0x0' }, ...inputs]

  const [inscriptionInfoCell] = await collector.getCells({ lock, type: inscriptionInfoType })
  const inscriptionInfoCellDep: CKBComponents.CellDep = {
    outPoint: inscriptionInfoCell.outPoint,
    depType: 'code',
  }
  let cellDeps = [getJoyIDCellDep(isMainnet), getXudtDep(isMainnet), getRebaseDep(isMainnet), inscriptionInfoCellDep]

  const preXudtType = calcXudtTypeScript(inscriptionInfoType, isMainnet)
  const preXudtCells = await collector.getCells({ type: preXudtType })
  const actualSupply = calcActualSupply(preXudtCells)
  const rebasedXudtType = calcRebasedXudtType(inscriptionInfoType, preXudtHash, actualSupply, isMainnet)

  const changeCapacity = inputCapacity - txFee
  let outputs: CKBComponents.CellOutput[] = [
    {
      capacity: `0x${changeCapacity.toString(16)}`,
      lock,
    },
    {
      ...xudtCell.output,
      type: rebasedXudtType,
    },
  ]

  const exceptedSupply = inscriptionInfo.maxSupply * BigInt(10 ** inscriptionInfo.decimal)
  const preAmount = leToU128(xudtCell.outputData)

  const expectedAmount = new BigNumber((preAmount * exceptedSupply).toString(), 10)
  const actualAmount = expectedAmount.dividedBy(new BigNumber(actualSupply.toString(), 10)).floor()
  const rebasedXudeCellData = append0x(u128ToLe(actualAmount))

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  let witnesses = [
    serializeWitnessArgs(emptyWitness),
    calcRebasedXudtWitness(inscriptionInfoType, preXudtHash, actualSupply, isMainnet),
  ]
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
    outputsData: ['0x', rebasedXudeCellData],
    witnesses,
  }

  return rawTx
}