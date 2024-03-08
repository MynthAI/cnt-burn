import path from "path";
import program from "cli";
import config from "config";
import { Assets, Data } from "lucid-cardano";
import {
  getDirname,
  getLucid,
  getNetwork,
  loadVaultConfig,
} from "mynth-helper";
import {
  filterUtxos,
  getContractAddress,
  getDatumHash,
  loadUtxoFromFile,
  processError,
  VoidDatum,
} from "utils";

const dirname = getDirname(import.meta.url);

program
  .command("claim")
  .description("Claims available ada")
  .argument("<address>", "Address of the wallet to submit the transaction")
  .action(async (address: string) => {
    await loadVaultConfig();
    const blockfrostApiKey = config.get<string>("blockfrost");
    const network = getNetwork(blockfrostApiKey);

    const [lucid, validator] = await Promise.all([
      getLucid(blockfrostApiKey),
      loadUtxoFromFile(path.join(dirname, `../../deployed/${network}.json`)),
    ]);
    const contractAddress = getContractAddress(lucid, validator);

    try {
      lucid.selectWalletFrom({ address });
    } catch (error) {
      program.error("Invalid address provided");
      return;
    }

    const contractUtxos = await lucid.utxosAt(contractAddress);
    const burned = filterUtxos(contractUtxos, getDatumHash(lucid, address));

    if (!burned.length) {
      program.error("Could not find existing burned tokens");
      return;
    }

    const tokens: Assets = {};
    burned.forEach((utxo) => {
      Object.entries(utxo.assets).forEach(([asset, amount]) => {
        if (asset === "lovelace") return;

        if (tokens[asset]) {
          tokens[asset] += amount;
        } else {
          tokens[asset] = amount;
        }
      });
    });

    const build = await processError(() =>
      lucid
        .newTx()
        .validTo(Date.now() + 200000)
        .collectFrom(burned, Data.void())
        .payToContract(contractAddress, VoidDatum, tokens)
        .addSigner(address)
        .readFrom([validator])
        .complete()
    );

    if (!build.ok) {
      program.error(build.error);
      return;
    }

    console.log(build.data.toString());
  });
