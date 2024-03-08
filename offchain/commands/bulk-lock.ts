import path from "path";
import program from "cli";
import { Argument } from "commander";
import config from "config";
import {
  getDirname,
  getLucid,
  getNetwork,
  loadVaultConfig,
} from "mynth-helper";
import {
  getBalance,
  getContractAddress,
  loadUtxoFromFile,
  processError,
  VoidDatum,
} from "utils";

const dirname = getDirname(import.meta.url);

program
  .command("bulk-lock")
  .description("Locks multiple tokens so they're available to burn")
  .argument("<address>", "Address containing the tokens to lock")
  .addArgument(
    new Argument("[amount]", "The number of tokens to lock").default(10)
  )
  .action(async (address: string, amountStr: string) => {
    const amount = parseInt(amountStr);

    if (!amount || amount < 1) {
      program.error("amount must be a number");
      return;
    }

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

    const balance = getBalance(await lucid.wallet.getUtxos());
    delete balance["lovelace"];
    const tokensToSend = Object.fromEntries(
      Object.entries(balance).slice(0, amount)
    );

    const build = await processError(() =>
      lucid
        .newTx()
        .validTo(Date.now() + 2000000)
        .payToContract(contractAddress, VoidDatum, tokensToSend)
        .complete()
    );

    if (!build.ok) {
      program.error(build.error);
      return;
    }

    console.log(build.data.toString());
  });
