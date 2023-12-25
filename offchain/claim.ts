import { Data, Lucid, UTxO } from "lucid-cardano";
import {
  filterUtxos,
  getBalance,
  getContractAddress,
  getDatumHash,
  VoidDatum,
} from "utils";

const claim = async (lucid: Lucid, utxos: UTxO[], validator: UTxO) => {
  const address = await lucid.wallet.address();
  utxos = filterUtxos(utxos, getDatumHash(lucid, address));

  const contractAddress = getContractAddress(lucid, validator);
  const balance = getBalance(utxos);
  const totalLovelace = balance.lovelace;
  delete balance.lovelace;

  let fee = 0n;
  let lovelace = totalLovelace;

  while (true) {
    const tx = await lucid
      .newTx()
      .collectFrom(utxos, Data.void())
      .payToAddress(address, { lovelace })
      .payToContract(contractAddress, VoidDatum, balance)
      .readFrom([validator])
      .addSigner(address)
      .complete();

    if (fee == BigInt(tx.fee)) return tx.sign().complete();

    const minUtxo = BigInt(
      tx.txComplete.body().outputs().get(1).to_js_value().amount.coin
    );
    fee = BigInt(tx.fee);
    lovelace = totalLovelace - minUtxo - fee;
  }
};

export { claim };
