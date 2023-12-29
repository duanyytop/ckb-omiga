import { Collector } from '../../src/collector'
import { buildDeployTx } from '../../src/inscription'
import { InscriptionInfo } from '../../src'
import { AddressPrefix } from '@nervosnetwork/ckb-sdk-utils'
import { blockchain } from '@ckb-lumos/base'

// SECP256K1 private key
const TEST_MAIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001'

const deploy = async () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  })
  const address = collector.getCkb().utils.privateKeyToAddress(TEST_MAIN_PRIVATE_KEY, { prefix: AddressPrefix.Testnet })
  console.log('address: ', address)

  const info: InscriptionInfo = {
    maxSupply: BigInt(2100_0000),
    mintLimit: BigInt(1000),
    xudtHash: '',
    mintStatus: 0,
    decimal: 8,
    name: 'CKB Fist Inscription',
    symbol: 'CKBI',
  }

  const { rawTx, inscriptionId } = await buildDeployTx({ collector, address, info })
  console.log('inscription id: ', inscriptionId)

  const secp256k1Dep: CKBComponents.CellDep = {
    outPoint: {
      txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
      index: '0x0',
    },
    depType: 'depGroup',
  }
  const witnessArgs = blockchain.WitnessArgs.unpack(rawTx.witnesses[0]) as CKBComponents.WitnessArgs
  let unsignedTx: CKBComponents.RawTransactionToSign = {
    ...rawTx,
    cellDeps: [...rawTx.cellDeps, secp256k1Dep],
    witnesses: [witnessArgs, ...rawTx.witnesses.slice(1)],
  }
  const signedTx = collector.getCkb().signTransaction(TEST_MAIN_PRIVATE_KEY)(unsignedTx)

  console.log(JSON.stringify(signedTx))

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`Inscription has been deployed with tx hash ${txHash}`)
}

deploy()
