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
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com",
);

const mint = address("EAC3xzWKfPB1P2tDLCZgojp5ETMMZA2DQMnBiQroqQKq");
const to = address("GjR3dhJwJMfmz1HeJgrUtf3rM7EWqanPTpCchrAuWoYt");

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });

    const [fromAta] = await findAssociatedTokenPda({
      mint,
      owner: signer.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log(`Your fromAta is : ${fromAta}`);

    const [toAta] = await findAssociatedTokenPda({
      mint,
      owner: to,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log(`Your toAta is : ${toAta}`);

    const createAtaIx = await getCreateAssociatedTokenInstructionAsync({
      payer: signer,
      mint,
      owner: to,
    });

    const transferTx = getTransferCheckedInstruction({
      source: fromAta,
      mint,
      destination: toAta,
      authority: signer,
      amount: 1_000_000n,
      decimals: 6,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const msg = createTransactionMessage({ version: 0 });

    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

    const msgWithLiftime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer,
    );

    const txMessage = appendTransactionMessageInstructions(
      [createAtaIx, transferTx],
      msgWithLiftime,
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);

    assertIsTransactionWithBlockhashLifetime(signedTx);

    const signature = getSignatureFromTransaction(signedTx);

    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    console.log(`mint txid: ${signature}`);
  } catch (error) {
    console.log(error);
  }
})();
