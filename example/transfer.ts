import { Collector } from '../src/collector'
import { addressFromPrivateKey, keyFromPrivate } from '../src/utils'
import { Aggregator } from '../src/aggregator'
import { buildTransferTx } from '../src/inscription'
import { ConnectResponseData } from '@joyid/ckb'
import { signSecp256r1Tx } from './signature/secp256r1'

// SECP256R1 private key
const TEST_MAIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001'

const mint = async () => {
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

  const inscriptionId = '0x96216d91f01b00fe76d1777e6c51ed0dcda74e6f0e6d6100258aca4452731bb8'
  const toAddress =
    'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqqyvjcfft3nvpwhzd4sjy65fuh0w3vectvsfeuuvw'
  const rawTx: CKBComponents.RawTransaction = await buildTransferTx({
    collector,
    aggregator,
    address,
    connectData,
    inscriptionId,
    toAddress,
    cellCount: 1,
  })
  const key = keyFromPrivate(TEST_MAIN_PRIVATE_KEY)
  const signedTx = signSecp256r1Tx(key, rawTx)

  console.log(JSON.stringify(signedTx))

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`Inscription has been transferred with tx hash ${txHash}`)
}

mint()
