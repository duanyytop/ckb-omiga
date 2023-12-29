import { Collector } from '../src/collector'
import { addressFromPrivateKey, keyFromPrivate } from '../src/utils'
import { Aggregator } from '../src/aggregator'
import { buildRebaseMintTx, calcInscriptionActualSupply } from '../src/inscription'
import { ConnectResponseData } from '@joyid/ckb'
import { signSecp256r1Tx } from './signature/secp256r1'
import { InscriptionInfo } from '../src'

// SECP256R1 private key
const TEST_MAIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001'

const rebaseMint = async () => {
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

  const preXudtHash = '0x026828de738ed147fb09947d97bb63f9c01616cc0ca50b0da3b2529abd5c9f21'

  const actualSupply = await calcInscriptionActualSupply({ collector, inscriptionId, isMainnet: false })

  const inscriptionInfo: InscriptionInfo = {
    maxSupply: BigInt(2100_0000),
    mintLimit: BigInt(1000),
    xudtHash: '',
    mintStatus: 0,
    decimal: 8,
    name: 'CKB Fist Inscription',
    symbol: 'CKBI',
  }

  const rawTx: CKBComponents.RawTransaction = await buildRebaseMintTx({
    collector,
    aggregator,
    address,
    connectData,
    preXudtHash,
    inscriptionId,
    actualSupply,
    inscriptionInfo,
  })
  const key = keyFromPrivate(TEST_MAIN_PRIVATE_KEY)
  const signedTx = signSecp256r1Tx(key, rawTx)

  console.log(JSON.stringify(signedTx))

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`Inscription xudt has been rebased with tx hash ${txHash}`)
}

rebaseMint()
