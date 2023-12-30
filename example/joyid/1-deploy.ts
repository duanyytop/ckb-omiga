import { Collector } from '../../src/collector'
import { addressFromP256PrivateKey, keyFromP256Private } from '../../src/utils'
import { Aggregator } from '../../src/aggregator'
import { buildDeployTx } from '../../src/inscription'
import { ConnectResponseData } from '@joyid/ckb'
import { InscriptionInfo, JoyIDConfig } from '../../src'
import { signSecp256r1Tx } from './secp256r1'

// SECP256R1 private key
const TEST_MAIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001'

const deploy = async () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  })
  const address = addressFromP256PrivateKey(TEST_MAIN_PRIVATE_KEY)
  console.log('address: ', address)

  const aggregator = new Aggregator('https://cota.nervina.dev/aggregator')
  // The connectData is the response of the connect with @joyid/ckb
  const connectData: ConnectResponseData = {
    address,
    ethAddress: '',
    nostrPubkey: '',
    pubkey: '',
    keyType: 'main_key',
    alg: -7,
  }
  // The JoyIDConfig is needed if the dapps use JoyID Wallet to connect and sign ckb transaction
  const joyID: JoyIDConfig = {
    aggregator,
    connectData,
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

  const { rawTx, inscriptionId, xudtHash } = await buildDeployTx({ collector, joyID, address, info })

  // the inscriptionId and xudtHash will be used in subsequent operations
  console.log('inscription id: ', inscriptionId)
  console.log('unrebased xudt hash: ', xudtHash)

  const key = keyFromP256Private(TEST_MAIN_PRIVATE_KEY)
  const signedTx = signSecp256r1Tx(key, rawTx)

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`Inscription has been deployed with tx hash ${txHash}`)
}

deploy()
