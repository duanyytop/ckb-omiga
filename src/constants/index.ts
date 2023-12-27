export const FEE = BigInt(6000)
export const MIN_CAPACITY = BigInt(63) * BigInt(100000000)
export const WITNESS_NATIVE_MODE = '01'
export const WITNESS_SUBKEY_MODE = '02'
export const SECP256R1_PUBKEY_SIG_LEN = (1 + 64 + 64) * 2

const TestnetInfo = {
  JoyIDLockScript: {
    codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  JoyIDLockDep: {
    outPoint: {
      txHash: '0x4dcf3f3b09efac8995d6cbee87c5345e812d310094651e0c3d9a730f32dc9263',
      index: '0x0',
    },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  CotaTypeScript: {
    codeHash: '0x89cd8003a0eaf8e65e0c31525b7d1d5c1becefd2ea75bb4cff87810ae37764d8',
    hashType: 'type',
    args: '0x',
  } as CKBComponents.Script,

  CotaTypeDep: {
    outPoint: {
      txHash: '0x636a786001f87cb615acfcf408be0f9a1f077001f0bbc75ca54eadfe7e221713',
      index: '0x0',
    },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  InscriptionInfoTypeScript: {
    codeHash: '0x50fdea2d0030a8d0b3d69f883b471cab2a29cae6f01923f19cecac0f27fdaaa6',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  InscriptionInfoDep: {
    outPoint: {
      txHash: '0x5c2705df3c0aa5486935248b1371d9309dce53c3aa2648a58694e3c025f97d83',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  InscriptionTypeScript: {
    codeHash: '0x3a241ceceede72a5f55c8fb985652690f09a517d6c9070f0df0d3572fa03fb70',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  InscriptionDep: {
    outPoint: {
      txHash: '0xc3c812e490fd6e879b73aed8841c66b81f5caf8be0f6bd4bc00a2b5b2f15180b',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  RebaseTypeScript: {
    codeHash: '0x93043b66bb20797caad0deacaadbada5e58f0893d770ecdddb8806aff8877e29',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  RebaseTypeDep: {
    outPoint: {
      txHash: '0xad0031fb2c1d3cb7c87fc44c49519d6fd26e0c68263d3ce433482f634b041851',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  XUDTTypeScript: {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  XUDTTypeDep: {
    outPoint: {
      txHash: '0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,
}

const MainnetInfo = {
  JoyIDLockScript: {
    codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  JoyIDLockDep: {
    outPoint: {
      txHash: '0x4dcf3f3b09efac8995d6cbee87c5345e812d310094651e0c3d9a730f32dc9263',
      index: '0x0',
    },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  CotaTypeScript: {
    codeHash: '0x1122a4fb54697cf2e6e3a96c9d80fd398a936559b90954c6e88eb7ba0cf652df',
    hashType: 'type',
    args: '0x',
  } as CKBComponents.Script,

  CotaTypeDep: {
    outPoint: {
      txHash: '0x875db3381ebe7a730676c110e1c0d78ae1bdd0c11beacb7db4db08e368c2cd95',
      index: '0x0',
    },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  InscriptionInfoTypeScript: {
    codeHash: '0x50fdea2d0030a8d0b3d69f883b471cab2a29cae6f01923f19cecac0f27fdaaa6',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  InscriptionInfoDep: {
    outPoint: {
      txHash: '0x5c2705df3c0aa5486935248b1371d9309dce53c3aa2648a58694e3c025f97d83',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  InscriptionTypeScript: {
    codeHash: '0x3a241ceceede72a5f55c8fb985652690f09a517d6c9070f0df0d3572fa03fb70',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  InscriptionDep: {
    outPoint: {
      txHash: '0xc3c812e490fd6e879b73aed8841c66b81f5caf8be0f6bd4bc00a2b5b2f15180b',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  RebaseTypeScript: {
    codeHash: '0x93043b66bb20797caad0deacaadbada5e58f0893d770ecdddb8806aff8877e29',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  RebaseTypeDep: {
    outPoint: {
      txHash: '0xad0031fb2c1d3cb7c87fc44c49519d6fd26e0c68263d3ce433482f634b041851',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  XUDTTypeScript: {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  XUDTTypeDep: {
    outPoint: {
      txHash: '0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,
}

export const getJoyIDLockScript = (isMainnet = false) =>
  isMainnet ? MainnetInfo.JoyIDLockScript : TestnetInfo.JoyIDLockScript
export const getJoyIDCellDep = (isMainnet = false) => (isMainnet ? MainnetInfo.JoyIDLockDep : TestnetInfo.JoyIDLockDep)

export const getCotaTypeScript = (isMainnet = false) =>
  isMainnet ? MainnetInfo.CotaTypeScript : TestnetInfo.CotaTypeScript
export const getCotaCellDep = (isMainnet = false) => (isMainnet ? MainnetInfo.CotaTypeDep : TestnetInfo.CotaTypeDep)

export const getInscriptionInfoTypeScript = (isMainnet = false) =>
  isMainnet ? MainnetInfo.InscriptionInfoTypeScript : TestnetInfo.InscriptionInfoTypeScript
export const getInscriptionInfoDep = (isMainnet = false) =>
  isMainnet ? MainnetInfo.InscriptionInfoDep : TestnetInfo.InscriptionInfoDep

export const getInscriptionTypeScript = (isMainnet = false) =>
  isMainnet ? MainnetInfo.InscriptionTypeScript : TestnetInfo.InscriptionTypeScript
export const getInscriptionDep = (isMainnet = false) =>
  isMainnet ? MainnetInfo.InscriptionInfoDep : TestnetInfo.InscriptionDep

export const getRebaseTypeScript = (isMainnet = false) =>
  isMainnet ? MainnetInfo.RebaseTypeScript : TestnetInfo.RebaseTypeScript
export const getRebaseDep = (isMainnet = false) => (isMainnet ? MainnetInfo.RebaseTypeDep : TestnetInfo.RebaseTypeDep)

export const getXudtTypeScript = (isMainnet = false) =>
  isMainnet ? MainnetInfo.XUDTTypeScript : TestnetInfo.XUDTTypeScript
export const getXudtDep = (isMainnet = false) => (isMainnet ? MainnetInfo.XUDTTypeDep : TestnetInfo.XUDTTypeDep)
