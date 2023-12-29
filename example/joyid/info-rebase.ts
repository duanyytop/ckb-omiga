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

  const inscriptionId = '0x96216d91f01b00fe76d1777e6c51ed0dcda74e6f0e6d6100258aca4452731bb8'
  const preXudtHash = '0x026828de738ed147fb09947d97bb63f9c01616cc0ca50b0da3b2529abd5c9f21'
  const actualSupply = await calcInscriptionActualSupply({ collector, inscriptionId, isMainnet: false })

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

  console.log(JSON.stringify(signedTx))

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`Inscription info has been rebased with tx hash ${txHash}`)
}

rebase()
