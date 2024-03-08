import path from "path";
import program from "cli";
import config from "config";
import Decimal from "decimal.js";
import {
  getDirname,
  getLucid,
  getNetwork,
  loadVaultConfig,
} from "mynth-helper";
import { getContractAddress, loadUtxoFromFile } from "utils";

const dirname = getDirname(import.meta.url);

program
  .command("get-locked")
  .description("Shows how much ADA is permanently locked due to misuse")
  .action(async () => {
    await loadVaultConfig();
    const blockfrostApiKey = config.get<string>("blockfrost");
    const network = getNetwork(blockfrostApiKey);

    const [lucid, validator] = await Promise.all([
      getLucid(blockfrostApiKey),
      loadUtxoFromFile(path.join(dirname, `../../deployed/${network}.json`)),
    ]);
    const contractAddress = getContractAddress(lucid, validator);
    const utxos = (await lucid.utxosAt(contractAddress)).filter(
      (utxo) => !utxo.datum && !utxo.datumHash
    );

    const lovelace = utxos.reduce(
      (sum, utxo) => sum + utxo.assets.lovelace,
      0n
    );
    console.log(
      new Decimal(lovelace.toString())
        .div(Decimal.pow(10, 6))
        .toFixed(6)
        .replace(/(\.\d*?[1-9])0+$/, "$1")
        .replace(/\.$/, "")
    );
  });
