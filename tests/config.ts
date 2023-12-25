import config from "config";
import { deploy } from "deploy";
import { SpendingValidator, UTxO } from "lucid-cardano";
import { TransactionChainer } from "mynth-helper";
import { readValidator } from "utils";

const getConfig = async () => {
  const validator = await readValidator("plutus.json");
  const blockfrostApiKey = config.get<string>("blockfrost");
  const seed = config.get<string>("wallets.seed1");
  const chainer = await TransactionChainer.loadWallet(blockfrostApiKey, seed);
  const lucid = await chainer.getLucid();
  const contractAddress = lucid.utils.validatorToAddress(validator);
  const token = config.get<string>("tokens.token1");

  return {
    validator,
    chainer,
    lucid,
    contractAddress,
    token,
  };
};

const getScriptUtxo = async (
  chainer: TransactionChainer,
  script: SpendingValidator
): Promise<UTxO> => {
  const lucid = await chainer.getLucid();
  const { address, tx } = await deploy(lucid, script);
  await chainer.registerAddress(address);
  await chainer.registerTx(tx);
  return chainer.getUtxo(tx.toHash());
};

export { getConfig, getScriptUtxo };
