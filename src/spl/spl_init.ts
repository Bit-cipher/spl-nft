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
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import {
  getInitializeMintInstruction,
  getMintSize,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

import { getCreateAccountInstruction } from "@solana-program/system";
import wallet from "../../devnet-wallet.json";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com",
);

(async () => {
  try {
    //create a signer from your wallet
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));

    //generate a new mint signer for address
    const mint = await generateKeyPairSigner();

    //get the size of the mint
    const space = BigInt(getMintSize());

    //get the minimum balance for rent exemption
    const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });

    const msg = createTransactionMessage({ version: 0 });

    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

    const msgWithLiftime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer,
    );

    const txMessage = appendTransactionMessageInstructions(
      [
        getCreateAccountInstruction({
          payer: signer,
          newAccount: mint,
          lamports: rent,
          space,
          programAddress: TOKEN_PROGRAM_ADDRESS,
        }),

        getInitializeMintInstruction({
          mint: mint.address,
          decimals: 6,
          mintAuthority: signer.address,
        }),
      ],
      msgWithLiftime,
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);

    assertIsTransactionWithBlockhashLifetime(signedTx);

    const signature = getSignatureFromTransaction(signedTx);

    //send and confirm the transaction
    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    console.log(
      `mint address: ${mint.address}. Transaction Signature: ${signature}`,
    );
  } catch (error) {
    console.log(error);
  }
})();

// mint address: EAC3xzWKfPB1P2tDLCZgojp5ETMMZA2DQMnBiQroqQKq. Transaction Signature: 2vRSNJjwDay1ccgVc4wFXToxsoqA9Toxw4a1y7Bv1GuZRMZtDgkTSzXNAxQuPAKtr7pFpPJhYWcRJKtuJif3wqYy
