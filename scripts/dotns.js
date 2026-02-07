import crypto from "crypto";
import { createClient } from "polkadot-api";
import { getPolkadotSigner } from "polkadot-api/signer";
import { getWsProvider } from "polkadot-api/ws-provider";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { Binary } from "polkadot-api";
import {
  encodeFunctionData,
  decodeFunctionResult,
  keccak256,
  toBytes,
  formatEther,
  isAddress,
  bytesToHex,
  isHex,
  toHex,
  zeroAddress,
  namehash,
} from "viem";
import { CID } from "multiformats/cid";

// RPC endpoints for Paseo Asset Hub
export const RPC_ENDPOINTS = [
  "wss://sys.ibp.network/asset-hub-paseo",
  "wss://testnet-passet-hub.polkadot.io",
];

// Contract addresses on Paseo Asset Hub (sys.ibp.network endpoint)
export const CONTRACTS = {
  DOTNS_REGISTRAR: "0x329aAA5b6bEa94E750b2dacBa74Bf41291E6c2BD",
  DOTNS_REGISTRAR_CONTROLLER: "0xd09e0F1c1E6CE8Cf40df929ef4FC778629573651",
  DOTNS_REGISTRY: "0x4Da0d37aBe96C06ab19963F31ca2DC0412057a6f",
  DOTNS_RESOLVER: "0x95645C7fD0fF38790647FE13F87Eb11c1DCc8514",
  DOTNS_CONTENT_RESOLVER: "0x7756DF72CBc7f062e7403cD59e45fBc78bed1cD7",
  STORE_FACTORY: "0x030296782F4d3046B080BcB017f01837561D9702",
  POP_ORACLE: "0x4e8920B1E69d0cEA9b23CBFC87A17Ee6fE02d2d3", // Note: Called DOTNS_RULES in latest version
};

// Constants
export const DECIMALS = 12n;
export const NATIVE_TO_ETH_RATIO = 1_000_000n;
export const OPERATION_TIMEOUT_MS = 300_000;
export const DEFAULT_MNEMONIC =
  "bottom drive obey lake curtain smoke basket hold race lonely fit walk";

// Proof of Personhood status enum
export const ProofOfPersonhoodStatus = {
  NoStatus: 0,
  ProofOfPersonhoodLite: 1,
  ProofOfPersonhoodFull: 2,
  Reserved: 3,
};

// ABI definitions
const DOTNS_REGISTRAR_CONTROLLER_ABI = [
  {
    inputs: [
      {
        name: "registration",
        type: "tuple",
        components: [
          { name: "label", type: "string" },
          { name: "owner", type: "address" },
          { name: "secret", type: "bytes32" },
          { name: "reserved", type: "bool" },
        ],
      },
    ],
    name: "makeCommitment",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "commitment", type: "bytes32" }],
    name: "commit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "minCommitmentAge",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        name: "registration",
        type: "tuple",
        components: [
          { name: "label", type: "string" },
          { name: "owner", type: "address" },
          { name: "secret", type: "bytes32" },
          { name: "reserved", type: "bool" },
        ],
      },
    ],
    name: "register",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

const DOTNS_REGISTRAR_ABI = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const POP_ORACLE_ABI = [
  {
    inputs: [{ name: "name", type: "string" }],
    name: "classifyName",
    outputs: [
      { name: "requirement", type: "uint8" },
      { name: "message", type: "string" },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ name: "name", type: "string" }],
    name: "price",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "userPopStatus",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "status", type: "uint8" }],
    name: "setUserPopStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "baseName", type: "string" }],
    name: "isBaseNameReserved",
    outputs: [
      { name: "isReserved", type: "bool" },
      { name: "owner", type: "address" },
      { name: "expiryBlock", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const STORE_FACTORY_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "getDeployedStore",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const DOTNS_CONTENT_RESOLVER_ABI = [
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "hash", type: "bytes" },
    ],
    name: "setContenthash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "contenthash",
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
];

// Helper functions
function convertToHexString(value) {
  if (!value) return "0x";
  if (typeof value?.asHex === "function") return value.asHex();
  if (typeof value?.toHex === "function") return value.toHex();
  if (typeof value === "string" && isHex(value)) return value;
  if (value instanceof Uint8Array) return bytesToHex(value);
  try {
    return toHex(value);
  } catch {
    return "0x";
  }
}

function convertToBigInt(value, fallback = 0n) {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    if (typeof value === "string") return BigInt(value);
    if (value && typeof value.toString === "function")
      return BigInt(value.toString());
    return fallback;
  } catch {
    return fallback;
  }
}

function normalizeWeight(weight) {
  const referenceTime = weight?.ref_time ?? weight?.refTime ?? 0;
  const proofSize = weight?.proof_size ?? weight?.proofSize ?? 0;
  return {
    referenceTime: convertToBigInt(referenceTime, 0n),
    proofSize: convertToBigInt(proofSize, 0n),
  };
}

function extractStorageDepositCharge(rawStorageDeposit) {
  if (!rawStorageDeposit) return 0n;
  if (typeof rawStorageDeposit?.isCharge === "boolean") {
    if (rawStorageDeposit.isCharge && rawStorageDeposit.asCharge != null) {
      return convertToBigInt(rawStorageDeposit.asCharge, 0n);
    }
    return 0n;
  }
  if (rawStorageDeposit.charge != null)
    return convertToBigInt(rawStorageDeposit.charge, 0n);
  if (rawStorageDeposit.Charge != null)
    return convertToBigInt(rawStorageDeposit.Charge, 0n);
  if (rawStorageDeposit.value != null)
    return convertToBigInt(rawStorageDeposit.value, 0n);
  return 0n;
}

function unwrapExecutionResult(rawResult) {
  if (!rawResult) return { ok: null, err: null, successFlag: null };
  if (typeof rawResult.success === "boolean") {
    return rawResult.success
      ? { ok: rawResult.value ?? null, err: null, successFlag: true }
      : {
          ok: null,
          err: rawResult.error ?? rawResult.value ?? null,
          successFlag: false,
        };
  }
  if (typeof rawResult.isOk === "boolean") {
    return rawResult.isOk
      ? { ok: rawResult.value ?? null, err: null, successFlag: true }
      : { ok: null, err: rawResult.value ?? null, successFlag: false };
  }
  if (rawResult.ok != null)
    return { ok: rawResult.ok, err: null, successFlag: true };
  if (rawResult.err != null)
    return { ok: null, err: rawResult.err, successFlag: false };
  return { ok: null, err: rawResult, successFlag: null };
}

function withTimeout(promise, timeoutMs, operationName) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () =>
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  return Promise.race([promise, timeoutPromise]);
}

/** Convert Wei to native Substrate units (12 decimals) */
export function convertWeiToNative(weiValue) {
  return weiValue / NATIVE_TO_ETH_RATIO;
}

/** Compute domain token ID from label */
export function computeDomainTokenId(label) {
  return BigInt(keccak256(toBytes(label)));
}

/** Count trailing digits in a label */
export function countTrailingDigits(label) {
  let count = 0;
  for (let i = label.length - 1; i >= 0; i--) {
    const code = label.charCodeAt(i);
    if (code >= 48 && code <= 57) count++;
    else break;
  }
  return count;
}

/** Strip trailing digits from label */
export function stripTrailingDigits(label) {
  return label.replace(/\d+$/, "");
}

/** Validate domain label according to DotNS rules */
export function validateDomainLabel(label) {
  if (!/^[a-z0-9-]{3,}$/.test(label)) {
    throw new Error(
      "Invalid domain label: must contain only lowercase letters, digits, and hyphens, min 3 chars",
    );
  }
  if (label.startsWith("-") || label.endsWith("-")) {
    throw new Error("Invalid domain label: cannot start or end with hyphen");
  }
  const trailingDigitCount = countTrailingDigits(label);
  if (trailingDigitCount > 2) {
    throw new Error(
      `Invalid domain label: max 2 trailing digits allowed, found ${trailingDigitCount}`,
    );
  }
}

/** Parse ProofOfPersonhood status from string */
export function parseProofOfPersonhoodStatus(status) {
  const s = (status ?? "none").toLowerCase();
  if (s === "none" || s === "nostatus") return ProofOfPersonhoodStatus.NoStatus;
  if (s === "lite" || s === "poplite")
    return ProofOfPersonhoodStatus.ProofOfPersonhoodLite;
  if (s === "full" || s === "popfull")
    return ProofOfPersonhoodStatus.ProofOfPersonhoodFull;
  throw new Error("Invalid status. Use none, lite, or full");
}

/** Client wrapper for interacting with Polkadot Asset Hub */
class ReviveClientWrapper {
  static DRY_RUN_STORAGE_LIMIT = 18446744073709551615n;
  static DRY_RUN_WEIGHT_LIMIT = {
    ref_time: 18446744073709551615n,
    proof_size: 18446744073709551615n,
  };

  constructor(client) {
    this.client = client;
    this.mappedAccounts = new Set();
  }

  async getEvmAddress(substrateAddress) {
    if (isAddress(substrateAddress)) return substrateAddress;
    const address = await this.client.apis.ReviveApi.address(substrateAddress);
    return address.asHex();
  }

  async performDryRunCall(
    originSubstrateAddress,
    contractAddress,
    value,
    encodedData,
  ) {
    if (isAddress(originSubstrateAddress)) {
      throw new Error(
        "performDryRunCall requires SS58 Substrate address, not EVM H160 address",
      );
    }

    const executionResults = await this.client.apis.ReviveApi.call(
      originSubstrateAddress,
      Binary.fromHex(contractAddress),
      value,
      ReviveClientWrapper.DRY_RUN_WEIGHT_LIMIT,
      ReviveClientWrapper.DRY_RUN_STORAGE_LIMIT,
      Binary.fromHex(encodedData),
    );

    const { ok, err, successFlag } = unwrapExecutionResult(
      executionResults.result,
    );
    const flags = ok?.flags ? convertToBigInt(ok.flags, 0n) : 0n;
    const returnData = convertToHexString(ok?.data);
    const didRevert = ok ? (flags & 1n) === 1n : true;
    const gasConsumed = normalizeWeight(executionResults.weight_consumed);
    const gasRequired = normalizeWeight(
      executionResults.weight_required ?? executionResults.weight_consumed,
    );
    const storageDepositValue = extractStorageDepositCharge(
      executionResults.storage_deposit,
    );
    const isOk = !!ok && !didRevert;
    const isErr =
      !ok ||
      didRevert ||
      !!err ||
      (typeof successFlag === "boolean" ? !successFlag : false);

    return {
      gasConsumed,
      gasRequired,
      storageDeposit: { value: storageDepositValue },
      result: {
        isOk,
        isErr,
        value: { data: ok ? returnData : "0x", flags: ok ? flags : 1n },
      },
    };
  }

  async estimateGasForCall(
    originSubstrateAddress,
    contractAddress,
    value,
    encodedData,
  ) {
    const result = await this.performDryRunCall(
      originSubstrateAddress,
      contractAddress,
      value,
      encodedData,
    );
    if (!result.result.isOk) {
      return {
        success: false,
        gasConsumed: result.gasConsumed,
        storageDeposit: result.storageDeposit.value,
        gasRequired: result.gasRequired,
        revertData: result.result.value.data,
        revertFlags: result.result.value.flags,
      };
    }
    return {
      success: true,
      gasConsumed: result.gasConsumed,
      storageDeposit: result.storageDeposit.value,
      gasRequired: result.gasRequired,
    };
  }

  async checkIfAccountMapped(substrateAddress) {
    try {
      const evmAddress = await this.getEvmAddress(substrateAddress);
      const key = Binary.fromHex(evmAddress);
      const mappedAccount =
        await this.client.query.Revive.OriginalAccount.getValue(key);
      return mappedAccount !== null && mappedAccount !== undefined;
    } catch {
      return false;
    }
  }

  async ensureAccountMapped(substrateAddress, signer) {
    if (isAddress(substrateAddress)) {
      throw new Error(
        "ensureAccountMapped requires SS58 Substrate address, not EVM H160 address",
      );
    }
    if (this.mappedAccounts.has(substrateAddress)) return;

    const isMapped = await this.checkIfAccountMapped(substrateAddress);
    if (isMapped) {
      this.mappedAccounts.add(substrateAddress);
      return;
    }

    const mappingExtrinsic = this.client.tx.Revive.map_account();
    try {
      await this.signAndSubmitExtrinsic(mappingExtrinsic, signer, () => {});
      this.mappedAccounts.add(substrateAddress);
    } catch (error) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes("AccountAlreadyMapped")) {
        this.mappedAccounts.add(substrateAddress);
        return;
      }
      throw error;
    }
  }

  signAndSubmitExtrinsic(extrinsic, signer, statusCallback) {
    return new Promise((resolve, reject) => {
      try {
        extrinsic.signSubmitAndWatch(signer).subscribe({
          next: (event) => {
            const transactionHash = event.txHash?.toString();
            switch (event.type) {
              case "signed":
                statusCallback("signing");
                break;
              case "broadcasted":
                statusCallback("broadcasting");
                break;
              case "txBestBlocksState":
                statusCallback("included");
                break;
              case "finalized":
                if (event.dispatchError) {
                  statusCallback("failed");
                  reject(
                    new Error(
                      `Transaction failed: ${event.dispatchError.toString()}`,
                    ),
                  );
                  return;
                }
                statusCallback("finalized");
                resolve(transactionHash);
                return;
              case "invalid":
              case "dropped":
                statusCallback("failed");
                reject(new Error(`Transaction ${event.type}`));
                return;
            }
          },
          error: (error) => {
            statusCallback("failed");
            reject(error);
          },
        });
      } catch (error) {
        statusCallback("failed");
        reject(error);
      }
    });
  }

  async submitTransaction(
    contractAddress,
    value,
    encodedData,
    signerSubstrateAddress,
    signer,
    statusCallback,
  ) {
    await this.ensureAccountMapped(signerSubstrateAddress, signer);

    const gasEstimate = await this.estimateGasForCall(
      signerSubstrateAddress,
      contractAddress,
      value,
      encodedData,
    );
    if (!gasEstimate.success) {
      throw new Error(
        `Contract execution would revert: ${gasEstimate.revertData ?? "0x"}`,
      );
    }

    const weightLimit = {
      proof_size: gasEstimate.gasRequired.proofSize,
      ref_time: gasEstimate.gasRequired.referenceTime,
    };

    const minimumStorageDeposit = 2_000_000_000_000n;
    let storageDepositLimit =
      gasEstimate.storageDeposit === 0n
        ? minimumStorageDeposit
        : (gasEstimate.storageDeposit * 120n) / 100n;
    if (storageDepositLimit < minimumStorageDeposit)
      storageDepositLimit = minimumStorageDeposit;

    const callExtrinsic = this.client.tx.Revive.call({
      dest: Binary.fromHex(contractAddress),
      value,
      weight_limit: weightLimit,
      storage_deposit_limit: storageDepositLimit,
      data: Binary.fromHex(encodedData),
    });

    return await this.signAndSubmitExtrinsic(
      callExtrinsic,
      signer,
      statusCallback,
    );
  }
}

/** DotNS client for domain registration and management */
export class DotNS {
  constructor() {
    this.client = null;
    this.clientWrapper = null;
    this.substrateAddress = null;
    this.evmAddress = null;
    this.signer = null;
    this.connected = false;
  }

  /** Connect to Paseo Asset Hub */
  async connect(options = {}) {
    const rpc = options.rpc || process.env.DOTNS_RPC || RPC_ENDPOINTS[0];
    const source =
      options.keyUri ||
      options.mnemonic ||
      process.env.DOTNS_KEY_URI ||
      process.env.DOTNS_MNEMONIC ||
      process.env.MNEMONIC ||
      DEFAULT_MNEMONIC;
    const isKeyUri = Boolean(options.keyUri || process.env.DOTNS_KEY_URI);

    console.log(`   Connecting to: ${rpc}`);
    console.log(`   Mnemonic: ${source}`);

    this.client = createClient(getWsProvider(rpc));
    const { paseo } = await import("@polkadot-api/descriptors");
    const typedApi = this.client.getTypedApi(paseo);
    this.clientWrapper = new ReviveClientWrapper(typedApi);

    await cryptoWaitReady();
    const keyring = new Keyring({ type: "sr25519" });
    const account = isKeyUri
      ? keyring.addFromUri(source)
      : keyring.addFromMnemonic(source);

    this.substrateAddress = account.address;
    this.evmAddress = await this.clientWrapper.getEvmAddress(
      this.substrateAddress,
    );
    this.signer = getPolkadotSigner(
      account.publicKey,
      "Sr25519",
      async (input) => account.sign(input),
    );
    this.connected = true;

    console.log(`   SS58 Address: ${this.substrateAddress}`);
    console.log(`   H160 Address: ${this.evmAddress}`);

    return this;
  }

  /** Ensure connected before operations */
  ensureConnected() {
    if (!this.connected) {
      throw new Error("Not connected. Call connect() first.");
    }
  }

  /** Perform a contract call (read-only) */
  async contractCall(contractAddress, contractAbi, functionName, args = []) {
    this.ensureConnected();
    const encodedCallData = encodeFunctionData({
      abi: contractAbi,
      functionName,
      args,
    });
    const callResult = await this.clientWrapper.performDryRunCall(
      this.substrateAddress,
      contractAddress,
      0n,
      encodedCallData,
    );

    if (!callResult.result.isOk) {
      const errorData = callResult.result.value;
      const flags = errorData?.flags ?? 0n;
      const revertData = errorData?.data ?? "0x";
      const isRevert = (flags & 1n) === 1n;
      if (isRevert)
        throw new Error(
          `Contract reverted (flags=${flags}) with data: ${revertData}`,
        );
      throw new Error(
        `Contract call failed (flags=${flags}) with data: ${revertData}`,
      );
    }

    return decodeFunctionResult({
      abi: contractAbi,
      functionName,
      data: callResult.result.value.data,
    });
  }

  /** Submit a contract transaction */
  async contractTransaction(
    contractAddress,
    value,
    contractAbi,
    functionName,
    args = [],
    statusCallback = () => {},
  ) {
    this.ensureConnected();
    await this.clientWrapper.ensureAccountMapped(
      this.substrateAddress,
      this.signer,
    );
    const encodedCallData = encodeFunctionData({
      abi: contractAbi,
      functionName,
      args,
    });
    return await withTimeout(
      this.clientWrapper.submitTransaction(
        contractAddress,
        value,
        encodedCallData,
        this.substrateAddress,
        this.signer,
        statusCallback,
      ),
      OPERATION_TIMEOUT_MS,
      functionName,
    );
  }

  /** Check if a domain is owned by a specific account */
  async checkOwnership(label, ownerAddress = null) {
    this.ensureConnected();
    const checkAddress = ownerAddress || this.evmAddress;
    const tokenId = computeDomainTokenId(label);

    try {
      const owner = await withTimeout(
        this.contractCall(
          CONTRACTS.DOTNS_REGISTRAR,
          DOTNS_REGISTRAR_ABI,
          "ownerOf",
          [tokenId],
        ),
        30000,
        "ownerOf",
      );
      const owned = owner.toLowerCase() === checkAddress.toLowerCase();
      return { owned, owner };
    } catch {
      return { owned: false, owner: null };
    }
  }

  /** Classify domain name via PopOracle */
  async classifyName(label) {
    this.ensureConnected();
    console.log(`\n   Classifying name via PopOracle...`);

    const result = await withTimeout(
      this.contractCall(CONTRACTS.POP_ORACLE, POP_ORACLE_ABI, "classifyName", [
        label,
      ]),
      30000,
      "classifyName",
    );

    const requiredStatus =
      typeof result[0] === "bigint" ? Number(result[0]) : result[0];
    const message = result[1];

    console.log(
      `   Required status: ${Object.keys(ProofOfPersonhoodStatus).find((k) => ProofOfPersonhoodStatus[k] === requiredStatus)}`,
    );
    console.log(`   Message: ${message}`);

    return { requiredStatus, message };
  }

  /** Get user Proof of Personhood status */
  async getUserPopStatus(ownerAddress = null) {
    this.ensureConnected();
    const checkAddress = ownerAddress || this.evmAddress;
    const result = await withTimeout(
      this.contractCall(CONTRACTS.POP_ORACLE, POP_ORACLE_ABI, "userPopStatus", [
        checkAddress,
      ]),
      30000,
      "userPopStatus",
    );
    return typeof result === "bigint" ? Number(result) : result;
  }

  /** Set user Proof of Personhood status */
  async setUserPopStatus(status) {
    this.ensureConnected();
    console.log(`\n   Checking current PoP status...`);

    const currentStatus = await this.getUserPopStatus();
    const currentStatusName = Object.keys(ProofOfPersonhoodStatus).find(
      (k) => ProofOfPersonhoodStatus[k] === currentStatus,
    );
    const desiredStatusName = Object.keys(ProofOfPersonhoodStatus).find(
      (k) => ProofOfPersonhoodStatus[k] === status,
    );

    console.log(`   Current: ${currentStatusName}`);
    console.log(`   Desired: ${desiredStatusName}`);

    if (currentStatus === status) {
      console.log(`   Status already set, skipping update`);
      return;
    }

    console.log(`   Setting PoP status to ${desiredStatusName}...`);

    const txHash = await this.contractTransaction(
      CONTRACTS.POP_ORACLE,
      0n,
      POP_ORACLE_ABI,
      "setUserPopStatus",
      [status],
      (s) => console.log(`      ${s}`),
    );

    console.log(`   Tx: ${txHash}`);
  }

  /** Ensure domain is not already registered */
  async ensureNotRegistered(label) {
    this.ensureConnected();
    console.log(`\n   Checking availability of ${label}.dot...`);

    const tokenId = computeDomainTokenId(label);
    try {
      const owner = await withTimeout(
        this.contractCall(
          CONTRACTS.DOTNS_REGISTRAR,
          DOTNS_REGISTRAR_ABI,
          "ownerOf",
          [tokenId],
        ),
        30000,
        "Availability check",
      );
      if (owner !== zeroAddress)
        throw new Error(`Domain ${label}.dot already owned by ${owner}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already owned")) throw error;
    }

    console.log(`   ${label}.dot is available`);
  }

  /** Generate commitment for domain registration */
  async generateCommitment(label, includeReverse = false) {
    this.ensureConnected();
    console.log(`\n   Generating commitment hash...`);

    validateDomainLabel(label);

    const secret = `0x${crypto.randomBytes(32).toString("hex")}`;
    const registration = {
      label,
      owner: this.evmAddress,
      secret,
      reserved: includeReverse,
    };

    const commitment = await withTimeout(
      this.contractCall(
        CONTRACTS.DOTNS_REGISTRAR_CONTROLLER,
        DOTNS_REGISTRAR_CONTROLLER_ABI,
        "makeCommitment",
        [registration],
      ),
      30000,
      "Commitment generation",
    );

    console.log(`   Commitment: ${commitment}`);

    return { commitment, registration };
  }

  /** Submit commitment transaction */
  async submitCommitment(commitment) {
    this.ensureConnected();
    console.log(`\n   Submitting commitment...`);

    const txHash = await this.contractTransaction(
      CONTRACTS.DOTNS_REGISTRAR_CONTROLLER,
      0n,
      DOTNS_REGISTRAR_CONTROLLER_ABI,
      "commit",
      [commitment],
      (s) => console.log(`      ${s}`),
    );

    console.log(`   Tx: ${txHash}`);
    console.log(`   Committed at: ${new Date().toISOString()}`);
  }

  /** Wait for minimum commitment age */
  async waitForCommitmentAge() {
    this.ensureConnected();
    console.log(`\n   Reading minimum commitment age...`);

    const minimumAge = await withTimeout(
      this.contractCall(
        CONTRACTS.DOTNS_REGISTRAR_CONTROLLER,
        DOTNS_REGISTRAR_CONTROLLER_ABI,
        "minCommitmentAge",
        [],
      ),
      30000,
      "minCommitmentAge",
    );

    const minimumAgeSeconds =
      typeof minimumAge === "bigint" ? Number(minimumAge) : minimumAge;
    const waitSeconds = minimumAgeSeconds + 10;

    console.log(`   Minimum commitment age: ${minimumAgeSeconds}s`);
    console.log(`   Waiting ${waitSeconds}s for commitment to mature...`);

    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));

    console.log(`   Commitment age requirement met`);
  }

  /** Get price and validate eligibility */
  async getPriceAndValidate(label) {
    this.ensureConnected();
    console.log(`\n   Checking price and eligibility...`);

    validateDomainLabel(label);

    const baseName = stripTrailingDigits(label);
    const reservationInfo = await withTimeout(
      this.contractCall(
        CONTRACTS.POP_ORACLE,
        POP_ORACLE_ABI,
        "isBaseNameReserved",
        [baseName],
      ),
      30000,
      "isBaseNameReserved",
    );

    const [isReserved, reservationOwner] = reservationInfo;
    if (
      isReserved &&
      reservationOwner.toLowerCase() !== this.evmAddress.toLowerCase()
    ) {
      throw new Error("Base name reserved for original Lite registrant");
    }

    const classificationResult = await withTimeout(
      this.contractCall(CONTRACTS.POP_ORACLE, POP_ORACLE_ABI, "classifyName", [
        label,
      ]),
      30000,
      "classifyName",
    );

    const requiredStatus =
      typeof classificationResult[0] === "bigint"
        ? Number(classificationResult[0])
        : classificationResult[0];
    const message = classificationResult[1];

    const userStatus = await this.getUserPopStatus();

    if (requiredStatus === ProofOfPersonhoodStatus.Reserved)
      throw new Error(message);

    if (requiredStatus === ProofOfPersonhoodStatus.ProofOfPersonhoodFull) {
      if (userStatus !== ProofOfPersonhoodStatus.ProofOfPersonhoodFull) {
        throw new Error("Requires Full Personhood verification");
      }
    } else if (
      requiredStatus === ProofOfPersonhoodStatus.ProofOfPersonhoodLite
    ) {
      if (
        userStatus !== ProofOfPersonhoodStatus.ProofOfPersonhoodLite &&
        userStatus !== ProofOfPersonhoodStatus.ProofOfPersonhoodFull
      ) {
        throw new Error("Requires Personhood Lite verification");
      }
    } else {
      const trailingDigitCount = countTrailingDigits(label);
      if (
        trailingDigitCount === 0 ||
        userStatus === ProofOfPersonhoodStatus.ProofOfPersonhoodLite
      ) {
        throw new Error("Personhood Lite cannot register base names");
      }
    }

    const priceRaw = await withTimeout(
      this.contractCall(CONTRACTS.POP_ORACLE, POP_ORACLE_ABI, "price", [label]),
      30000,
      "price",
    );

    const priceWei = typeof priceRaw === "bigint" ? priceRaw : BigInt(priceRaw);

    const requiredStatusName = Object.keys(ProofOfPersonhoodStatus).find(
      (k) => ProofOfPersonhoodStatus[k] === requiredStatus,
    );
    const userStatusName = Object.keys(ProofOfPersonhoodStatus).find(
      (k) => ProofOfPersonhoodStatus[k] === userStatus,
    );

    console.log(`   Required status: ${requiredStatusName}`);
    console.log(`   User status: ${userStatusName}`);
    console.log(`   Price: ${formatEther(priceWei)} PAS`);

    return { priceWei, requiredStatus, userStatus, message };
  }

  /** Finalize registration */
  async finalizeRegistration(registration, priceWei) {
    this.ensureConnected();
    console.log(
      `\n   Finalizing registration for ${registration.label}.dot...`,
    );

    const bufferedPaymentWei = (priceWei * 110n) / 100n;
    const bufferedPaymentNative = convertWeiToNative(bufferedPaymentWei);

    console.log(`   Oracle price: ${formatEther(priceWei)} PAS`);
    console.log(`   Paying: ${formatEther(bufferedPaymentWei)} PAS`);

    const txHash = await this.contractTransaction(
      CONTRACTS.DOTNS_REGISTRAR_CONTROLLER,
      bufferedPaymentNative,
      DOTNS_REGISTRAR_CONTROLLER_ABI,
      "register",
      [registration],
      (s) => console.log(`      ${s}`),
    );

    console.log(`   Tx: ${txHash}`);
  }

  /** Verify domain ownership after registration */
  async verifyOwnership(label) {
    this.ensureConnected();
    console.log(`\n   Verifying ownership...`);

    const tokenId = computeDomainTokenId(label);
    const actualOwner = await withTimeout(
      this.contractCall(
        CONTRACTS.DOTNS_REGISTRAR,
        DOTNS_REGISTRAR_ABI,
        "ownerOf",
        [tokenId],
      ),
      30000,
      "ownerOf",
    );

    if (actualOwner.toLowerCase() !== this.evmAddress.toLowerCase()) {
      console.log(`   Expected: ${this.evmAddress}`);
      console.log(`   Actual: ${actualOwner}`);
      throw new Error(`Owner mismatch for ${label}.dot`);
    }

    console.log(`   Owner: ${actualOwner}`);
  }

  /** Set contenthash on resolver */
  async setContenthash(domainName, contenthashHex) {
    this.ensureConnected();
    const node = namehash(`${domainName}.dot`);

    // Decode IPFS CID from contenthash
    let ipfsCid = null;
    if (contenthashHex && contenthashHex !== "0x") {
      const bytes = Buffer.from(contenthashHex.slice(2), "hex");
      if (bytes[0] === 0xe3 && bytes.length >= 4) {
        const cidBytes = bytes.slice(2);
        ipfsCid = CID.decode(cidBytes).toString();
      }
    }

    console.log(`   Setting contenthash: ${ipfsCid || contenthashHex}`);

    const txHash = await this.contractTransaction(
      CONTRACTS.DOTNS_CONTENT_RESOLVER,
      0n,
      DOTNS_CONTENT_RESOLVER_ABI,
      "setContenthash",
      [node, contenthashHex],
      (s) => console.log(`      ${s}`),
    );

    console.log(`   Tx: ${txHash}`);
    console.log(`   Contenthash set successfully!\n`);

    return { node };
  }

  /** Register a new domain (full flow) */
  async register(label, options = {}) {
    const status = parseProofOfPersonhoodStatus(
      options.status || process.env.DOTNS_STATUS,
    );
    const reverse =
      options.reverse ??
      (process.env.DOTNS_REVERSE ?? "false").toLowerCase() === "true";

    if (!this.connected) {
      await this.connect(options);
    }

    validateDomainLabel(label);
    await this.classifyName(label);
    await this.setUserPopStatus(status);
    await this.ensureNotRegistered(label);

    const { commitment, registration } = await this.generateCommitment(
      label,
      reverse,
    );
    await this.submitCommitment(commitment);
    await this.waitForCommitmentAge();

    const pricing = await this.getPriceAndValidate(label);
    await this.finalizeRegistration(registration, pricing.priceWei);
    await this.verifyOwnership(label);

    console.log(`\n   Registration complete!`);

    return { label, owner: this.evmAddress };
  }

  /** Disconnect from Paseo Asset Hub */
  disconnect() {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      this.clientWrapper = null;
      this.connected = false;
    }
  }
}

// Default instance
export const dotns = new DotNS();
