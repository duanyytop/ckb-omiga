import { Collector } from '../../src/collector'
import { addressFromP256PrivateKey, keyFromP256Private } from '../../src/utils'
import { Aggregator } from '../../src/aggregator'
import { buildInfoRebaseTx, calcInscriptionActualSupply } from '../../src/inscription'
import { ConnectResponseData } from '@joyid/ckb'
import { signSecp256r1Tx } from './secp256r1'
import { JoyIDConfig } from '../../src'

// SECP256R1 private key
const TEST_MAIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001'

const rebase = async () => {
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

  // the inscriptionId and preXudtHash come from inscription deploy transaction
  const inscriptionId = '0xcd89d8f36593a9a82501c024c5cdc4877ca11c5b3d5831b3e78334aecb978f0d'
  const preXudtHash = '0x5fa66c8d5f43914f85d3083e0529931883a5b0a14282f891201069f1b5067908'

  // the actualSupply will be used in subsequent operations
  const actualSupply = await calcInscriptionActualSupply({ collector, inscriptionId, isMainnet: false })

  console.log('actual supply', actualSupply.toString())

  const rawTx: CKBComponents.RawTransaction = await buildInfoRebaseTx({
    collector,
    joyID,
    address,
    preXudtHash,
    actualSupply,
    inscriptionId,
  })
  const key = keyFromP256Private(TEST_MAIN_PRIVATE_KEY)
  const signedTx = signSecp256r1Tx(key, rawTx)

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`Inscription info has been rebased with tx hash ${txHash}`)
}

rebase()
