import { Assets, Data, Lucid, UTxO } from "lucid-cardano";
import { filterUtxos, getBalance, getContractAddress, VoidDatum } from "utils";

const burn = async (
  lucid: Lucid,
  utxos: UTxO[],
  tokens: Assets,
  validator: UTxO
) => {
  utxos = filterUtxos(utxos);
  const contractAddress = getContractAddress(lucid, validator);

  const balance = getBalance(utxos);
  Object.keys(tokens).forEach((token) => {
    balance[token] = (balance[token] || 0n) + tokens[token];
  });
  delete balance.lovelace;

  const tx = await lucid
    .newTx()
    .collectFrom(utxos, Data.void())
    .payToContract(contractAddress, VoidDatum, balance)
    .readFrom([validator])
    .complete();

  return tx.sign().complete();
};

export { burn };
