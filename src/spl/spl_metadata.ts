import "dotenv/config";
import { webcrypto } from "crypto";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}

// Polyfill CustomEvent
class NodeCustomEvent<T = any> extends Event {
  detail: T;

  constructor(type: string, params?: CustomEvent<T>) {
    super(type);
    this.detail = params?.detail as T;
  }
}

(globalThis as any).CustomEvent = NodeCustomEvent;

import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import wallet from "../../devnet-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createMetadataAccountV3,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionArgs,
  DataV2Args,
} from "@metaplex-foundation/mpl-token-metadata";
import bs58 from "bs58";

const mint = publicKey("EAC3xzWKfPB1P2tDLCZgojp5ETMMZA2DQMnBiQroqQKq");

const umi = createUmi("https://api.devnet.solana.com");

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

(async () => {
  try {
    const accounts: CreateMetadataAccountV3InstructionAccounts = {
      mint,
      mintAuthority: signer,
    };

    const data: DataV2Args = {
      name: "Dog coin",
      symbol: "DOG",
      uri: "https://raw.githubusercontent.com/Bit-cipher/json/main/cipher.json",
      sellerFeeBasisPoints: 1,
      creators: null,
      collection: null,
      uses: null,
    };

    const args: CreateMetadataAccountV3InstructionArgs = {
      data,
      isMutable: true,
      collectionDetails: null,
    };
    const tx = createMetadataAccountV3(umi, {
      ...accounts,
      ...args,
    });

    const result = await tx.sendAndConfirm(umi);
    console.log("signature: ", bs58.encode(Buffer.from(result.signature)));
  } catch (error) {
    console.log("error", error);
  }
})();

// signature:  4m7iPkARrdaNE8BxwYx7RbEmZEuyCGPTMJxatVFSbDxYs87gPgfnz5P5pdmASSa93SnMkDiqum6Bj7RdMbQgywQr
