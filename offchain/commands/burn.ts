import path from "path";
import program from "cli";
import config from "config";
import { Data } from "lucid-cardano";
import { getDirname, getNetwork, loadVaultConfig } from "mynth-helper";
import {
  getContractAddress,
  loadLucidFromAddress,
  loadUtxoFromFile,
  processError,
  Void,
  VoidDatum,
} from "utils";

const dirname = getDirname(import.meta.url);

program
  .command("burn")
  .description("Burns a token")
  .argument("<address>", "Address containing the token to burn")
  .argument("<token>", "Token to be burned")
  .argument("[amount]", "The amount to burn")
  .action(async (address: string, token: string, amount: string) => {
    try {
      if (amount) if (BigInt(amount) === 0n) throw new Error();
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
    const [contractUtxos, userUtxos] = await Promise.all([
      lucid.utxosAt(contractAddress),
      lucid.wallet.getUtxos(),
    ]);

    const burned = contractUtxos.find(
      (utxo) => utxo.datum === Void && utxo.assets[token]
    );

    if (!burned) {
      program.error("Could not find locked token. Run lock command first.");
      return;
    }

    const balance = userUtxos.reduce((acc, utxo) => {
      return utxo.assets[token] ? acc + utxo.assets[token] : acc;
    }, 0n);

    if (balance === 0n) {
      program.error("Requested token to burn not found in wallet");
      return;
    }

    const tokens = { ...burned.assets };
    tokens[token] += amount ? BigInt(amount) : balance;
    delete tokens.lovelace;

    const build = await processError(() =>
      lucid
        .newTx()
        .validTo(Date.now() + 2000000)
        .collectFrom([burned], Data.void())
        .payToContract(contractAddress, VoidDatum, tokens)
        .readFrom([validator])
        .complete()
    );

    if (!build.ok) {
      program.error(build.error);
      return;
    }

    console.log(build.data.toString());
  });
