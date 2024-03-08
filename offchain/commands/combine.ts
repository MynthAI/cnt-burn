import path from "path";
import program from "cli";
import config from "config";
import { Assets, Data } from "lucid-cardano";
import { getDirname, getNetwork, loadVaultConfig } from "mynth-helper";
import {
  filterUtxos,
  getContractAddress,
  getDatumHash,
  loadLucidFromAddress,
  loadUtxoFromFile,
  processError,
  VoidDatum,
} from "utils";

const dirname = getDirname(import.meta.url);

program
  .command("combine")
  .description("Combines mutliple UTXOs")
  .argument("<address>", "Address submitting the transaction")
  .argument("<amount>", "The number of UTXOs to combine")
  .action(async (address: string, amount: string) => {
    try {
      if (parseInt(amount) < 1) throw new Error();
    } catch (error) {
      program.error("Amount must be a whole number");
      return;
    }

    await loadVaultConfig();
    const blockfrostApiKey = config.get<string>("blockfrost");
    const network = getNetwork(blockfrostApiKey);

    const [lucid, validator] = await Promise.all([
      loadLucidFromAddress(blockfrostApiKey, address),
      loadUtxoFromFile(path.join(dirname, `../../deployed/${network}.json`)),
    ]);
    const contractAddress = getContractAddress(lucid, validator);
    const contractUtxos = await lucid.utxosAt(contractAddress);

    const encode = (utxo: object) =>
      new TextEncoder().encode(
        JSON.stringify(utxo, (_, v) =>
          typeof v === "bigint" ? v.toString() : v
        )
      );

    // Find smallest UTXOs
    const sortedUtxos = filterUtxos(
      contractUtxos,
      getDatumHash(lucid, address)
    ).sort((a, b) => {
      return encode(a).length - encode(b).length;
    });
    const combined = sortedUtxos.slice(0, parseInt(amount));
    const tokens = combined.reduce((acc, { assets }) => {
      Object.entries(assets).forEach(([key, value]) => {
        acc[key] = (acc[key] || 0n) + value;
      });
      return acc;
    }, {} as Assets);
    delete tokens.lovelace;

    const build = await processError(() =>
      lucid
        .newTx()
        .validTo(Date.now() + 2000000)
        .collectFrom(combined, Data.void())
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
