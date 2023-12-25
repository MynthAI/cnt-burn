import { spawn } from "child_process";
import fs from "fs/promises";
import { claim } from "claim";
import config from "config";
import Enquirer from "enquirer";
import { lock } from "lock";
import { Data, Lucid, SpendingValidator, toText, UTxO } from "lucid-cardano";
import {
  getNetwork,
  invariant,
  loadVaultConfig,
  TransactionChainer,
} from "mynth-helper";
import { Err, Ok, Result } from "ts-res";
import { getBalance, getContractAddress, readValidator } from "utils";

const createAlwaysFailScript = (): SpendingValidator => {
  const header = "5839010000322253330033371e9101203";
  const body = Array.from({ length: 63 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
  const footer = "0048810014984d9595cd01";

  return {
    type: "PlutusV2",
    script: `${header}${body}${footer}`,
  };
};

const generateAddress = (lucid: Lucid): string => {
  return lucid.utils.validatorToAddress(createAlwaysFailScript());
};

const deploy = async (lucid: Lucid, validator: SpendingValidator) => {
  const address = generateAddress(lucid);
  const tx = await lucid
    .newTx()
    .payToContract(
      address,
      {
        inline: Data.void(),
        scriptRef: validator,
      },
      {}
    )
    .complete();

  return { address, tx: await tx.sign().complete() };
};

const buildAiken = (): Promise<Result<void, string>> => {
  const aiken = spawn("aiken", ["build"], { stdio: "inherit" });

  return new Promise<Result<void, string>>((resolve) => {
    aiken.on("close", (code) => {
      resolve(code === 0 ? Ok() : Err(code ? code.toString() : "1"));
    });
  });
};

const requestSeed = async (): Promise<Result<string, void>> => {
  try {
    const enquirer = new Enquirer();
    const response = await enquirer.prompt({
      type: "password",
      name: "seed",
      message: "Enter seed phrase for funding wallet:\n",
    });

    invariant(
      response &&
        "seed" in response &&
        typeof response.seed == "string" &&
        response.seed.trim()
    );

    return Ok(response.seed.trim());
  } catch (error) {
    return Err();
  }
};

const userDeploy = async (): Promise<number> => {
  await loadVaultConfig();
  const blockfrostApiKey = config.get<string>("blockfrost");
  const network = getNetwork(blockfrostApiKey);

  console.log("Building Aiken code");
  const buildResult = await buildAiken();
  if (!buildResult.ok) return parseInt(buildResult.error);
  const validator = await readValidator("plutus.json");

  console.log(`\n\nDeploying cnt-burn on ${network}`);
  const seedResult = await requestSeed();
  if (!seedResult.ok) return 1;
  const seed = seedResult.data;

  const chainer = await TransactionChainer.loadWallet(blockfrostApiKey, seed);
  const lucid = await chainer.getLucid();
  const [utxos, address] = await Promise.all([
    lucid.wallet.getUtxos(),
    lucid.wallet.address(),
  ]);
  const balance = getBalance(utxos);
  const totalTokens = Object.keys(balance).length;

  if (totalTokens == 0) {
    console.error(`${address} requires funding`);
    return 1;
  }

  if (balance["lovelace"] < 10000000n) {
    console.error(`${address} needs at least 10 ADA`);
  }

  if (totalTokens == 1) {
    console.error(`${address} requires needs a token to burn`);
    return 1;
  }

  if (totalTokens > 2) {
    console.error(
      address,
      "contains too many tokens.",
      "Use a fresh wallet with only ADA and the token to burn."
    );
    return 1;
  }

  const deployed = await deploy(lucid, validator);
  await chainer.registerAddress(deployed.address);
  await chainer.registerTx(deployed.tx);
  const referenceUtxo = chainer.getUtxo(deployed.tx.toHash());
  const contractAddress = getContractAddress(lucid, referenceUtxo);
  await chainer.registerAddress(contractAddress);

  const token = Object.keys(balance).filter((token) => token != "lovelace")[0];
  console.log("Locking 1", toText(token.substring(56)));

  const lockTx = await lock(
    lucid,
    { lovelace: 5000000n, [token]: 1n },
    referenceUtxo
  );
  chainer.registerTx(lockTx);

  const claimTx = await claim(
    lucid,
    chainer.getUtxos(contractAddress),
    referenceUtxo
  );
  chainer.registerTx(claimTx);

  await chainer.submit();
  console.log("Script deployed. Waiting for blockchain confirmation.");

  let onchain: UTxO[] = [];
  const ref = [{ txHash: deployed.tx.toHash(), outputIndex: 0 }];

  while (onchain.length == 0) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    onchain = await lucid.utxosByOutRef(ref);
  }

  console.log("Successfully deployed on-chain");
  const jsonString = JSON.stringify(onchain[0], (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  await fs.writeFile("cnt-burn.json", jsonString);

  console.log("Saved cnt-burn.json");
  return 0;
};

export { deploy, userDeploy };
