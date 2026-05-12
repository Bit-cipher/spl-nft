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
  address,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import wallet from "../../devnet-wallet.json";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstructionAsync,
  getMintToInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com",
);

const token_decimals = 1_000_000n;

const mint = address("EAC3xzWKfPB1P2tDLCZgojp5ETMMZA2DQMnBiQroqQKq");

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));

    const [ata] = await findAssociatedTokenPda({
      mint,
      owner: signer.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log(`Your ata is : ${ata}`);

    const createAtaIx = await getCreateAssociatedTokenInstructionAsync({
      payer: signer,
      mint,
      owner: signer.address,
    });

    const mintToIx = getMintToInstruction({
      mint,
      token: ata,
      mintAuthority: signer,
      amount: 1n * token_decimals,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const msg = createTransactionMessage({ version: 0 });

    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

    const msgWithLiftime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer,
    );

    const txMessage = appendTransactionMessageInstructions(
      [createAtaIx, mintToIx],
      msgWithLiftime,
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);

    assertIsTransactionWithBlockhashLifetime(signedTx);

    const signature = getSignatureFromTransaction(signedTx);

    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });

    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    console.log(`mint txid: ${signature}`);
  } catch (error) {
    console.log(error);
  }
})();


// Your ata is : HmbJdXXRPssJySyWsUrtPmF8xoac1frpxkyRZYJrTTD5
// mint txid: 2qsjrAiQndwRhaXXg34H9K4ADDKmVqfUvxPvQUNRMRLZPLtRZFuMMFGgUWv371EdXt6cHxcMJWoQPd2S3cADUJnU