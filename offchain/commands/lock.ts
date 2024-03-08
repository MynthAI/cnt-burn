import path from "path";
import program from "cli";
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
  getDatum,
  loadUtxoFromFile,
  processError,
} from "utils";

const dirname = getDirname(import.meta.url);

program
  .command("lock")
  .description("Locks a token so it's available to burn")
  .argument("<address>", "Address containing the token to lock")
  .argument("[token]", "Token to be lock")
  .action(async (address: string, token: string) => {
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

    const assets = token
      ? { [token]: 1n }
      : getBalance(await lucid.wallet.getUtxos());
    delete assets["lovelace"];

    const build = await processError(() =>
      lucid
        .newTx()
        .validTo(Date.now() + 200000)
        .payToContract(contractAddress, getDatum(lucid, address), assets)
        .complete()
    );

    if (!build.ok) {
      program.error(build.error);
      return;
    }

    console.log(build.data.toString());
  });
