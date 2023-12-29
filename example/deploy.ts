import { Collector } from '../src/collector'
import { addressFromPrivateKey, keyFromPrivate } from '../src/utils'
import { Aggregator } from '../src/aggregator'
import { buildDeployTx } from '../src/inscription'
import { ConnectResponseData } from '@joyid/ckb'
import { InscriptionInfo } from '../src'
import { signSecp256r1Tx } from './signature/secp256r1'

// SECP256R1 private key
const TEST_MAIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001'

const deploy = async () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  })
  const aggregator = new Aggregator('https://cota.nervina.dev/aggregator')
  const address = addressFromPrivateKey(TEST_MAIN_PRIVATE_KEY)
  console.log('address: ', address)

  const connectData: ConnectResponseData = {
    address,
    ethAddress: '',
    nostrPubkey: '',
    pubkey: '',
    keyType: 'main_key',
    alg: -7,
  }

  const info: InscriptionInfo = {
    maxSupply: BigInt(2100_0000),
    mintLimit: BigInt(1000),
    xudtHash: '',
    mintStatus: 0,
    decimal: 8,
    name: 'CKB Fist Inscription',
    symbol: 'CKBI',
  }

  const { rawTx, inscriptionId } = await buildDeployTx({ collector, aggregator, address, connectData, info })
  console.log('inscription id: ', inscriptionId)
  const key = keyFromPrivate(TEST_MAIN_PRIVATE_KEY)
  const signedTx = signSecp256r1Tx(key, rawTx)

  console.log(JSON.stringify(signedTx))

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`Inscription has been deployed with tx hash ${txHash}`)
}

deploy()
