import { addressToScript, blake160, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import {
  FEE,
  getJoyIDCellDep,
  getInscriptionInfoTypeScript,
  getInscriptionInfoDep,
  getCotaTypeScript,
} from '../constants'
import { CloseParams, SubkeyUnlockReq } from '../types'
import { calculateTransactionFee, setInscriptionInfoClosed } from './helper'
import { append0x } from '../utils'
import { InscriptionInfoException, NoCotaCellException } from '../exceptions'

export const buildCloseTx = async ({
  collector,
  joyID,
  address,
  inscriptionId,
  feeRate,
}: CloseParams): Promise<CKBComponents.RawTransaction> => {
  const txFee = calculateTransactionFee(feeRate) ?? FEE
  const isMainnet = address.startsWith('ckb')
  const inscriptionInfoType = {
    ...getInscriptionInfoTypeScript(isMainnet),
    args: append0x(inscriptionId),
  }
  const lock = addressToScript(address)
  const [inscriptionInfoCell] = await collector.getCells({ lock, type: inscriptionInfoType })
  if (!inscriptionInfoCell) {
    throw new InscriptionInfoException('The address has no inscription info cells')
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
