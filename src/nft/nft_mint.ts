import "dotenv/config";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import wallet from "../../devnet-wallet.json";
import {
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { create, mplCore } from "@metaplex-foundation/mpl-core";
import { base58 } from "@metaplex-foundation/umi/serializers";

const umi = createUmi(
  "https://api.devnet.solana.com",
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

umi.use(mplCore());

(async () => {
  try {
    const metadataUri =
      "https://gateway.irys.xyz/GiEFDz52M5n7fNAAMdBg9z6QZWwXYf2k8hqSjYGdRquH";
    const asset = generateSigner(umi);

    const tx = await create(umi, {
      asset,
      name: "cipher",
      uri: metadataUri,
    }).sendAndConfirm(umi);

    const signature = base58.deserialize(tx.signature)[0];

    console.log(`signature ${signature} , asset : ${asset.publicKey}`);
  } catch (e) {
    console.log(`errior ${e}`);
  }
})();
