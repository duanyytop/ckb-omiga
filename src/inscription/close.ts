import { addressToScript, blake160, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import {
  FEE,
  getJoyIDCellDep,
  getInscriptionInfoTypeScript,
  getInscriptionInfoDep,
  getCotaTypeScript,
} from '../constants'
import { Collector } from '../collector'
import { Address, Byte32, SubkeyUnlockReq } from '../types'
import { setInscriptionInfoClosed } from './helper'
import { append0x } from '../utils'
import { ConnectResponseData } from '@joyid/ckb'
import { Aggregator } from '../aggregator'

export interface CloseParams {
  collector: Collector
  aggregator: Aggregator
  address: Address
  inscriptionId: Byte32
  connectData: ConnectResponseData
  fee?: bigint
}
export const buildCloseTx = async ({
  collector,
  aggregator,
  address,
  inscriptionId,
  connectData,
  fee,
}: CloseParams): Promise<CKBComponents.RawTransaction> => {
  const txFee = fee ?? FEE
  const isMainnet = address.startsWith('ckb')
  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const lock = addressToScript(address)
  const [inscriptionInfoCell] = await collector.getCells(lock, inscriptionInfoType)
  console.log(JSON.stringify(inscriptionInfoCell))
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

  const inscriptionInfo = setInscriptionInfoClosed(inscriptionInfoCell.outputData)

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
    const cotaCells = await collector.getCells(lock, cotaType)
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
