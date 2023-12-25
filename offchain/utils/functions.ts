import fs from "fs/promises";
import {
  Address,
  Assets,
  C,
  Constr,
  Data,
  fromHex,
  Lucid,
  SpendingValidator,
  UTxO,
} from "lucid-cardano";
import { invariant } from "mynth-helper";

const Void = "d87a80";
const VoidDatum = { inline: Void };

const getBalance = (utxos: UTxO[]) => {
  const balances: Assets = {};
  return utxos.reduce((balances, utxo) => {
    Object.entries(utxo.assets).forEach(([assetId, balance]) => {
      balances[assetId] = (balances[assetId] || 0n) + balance;
    });

    return balances;
  }, balances);
};

const readValidator = async (path: string): Promise<SpendingValidator> => {
  const { compiledCode } = JSON.parse(await fs.readFile(path, "utf8"))
    .validators[0];

  return {
    type: "PlutusV2",
    script: compiledCode,
  };
};

const getContractAddress = (lucid: Lucid, referenceScript: UTxO): Address => {
  invariant(
    referenceScript.scriptRef && referenceScript.scriptRef.type == "PlutusV2",
    "No PlutusV2 script attached to UTXO"
  );

  return lucid.utils.validatorToAddress(referenceScript.scriptRef);
};

const loadUtxoFromFile = async (path: string): Promise<UTxO> => {
  const utxo: UTxO = JSON.parse(await fs.readFile(path, "utf8"));

  for (const asset in utxo.assets) {
    utxo.assets[asset] = BigInt(utxo.assets[asset]);
  }

  return utxo;
};

const getDatumHash = (lucid: Lucid, address: Address) => {
  const details = lucid.utils.getAddressDetails(address);
  invariant(
    details.paymentCredential,
    `Could not determine address from ${address}`
  );

  return C.hash_plutus_data(
    C.PlutusData.from_bytes(
      fromHex(Data.to(new Constr(0, [details.paymentCredential.hash])))
    )
  ).to_hex();
};

const filterUtxos = (utxos: UTxO[], datumHash?: string) =>
  utxos.filter(
    (utxo) => utxo.datum == Void || (datumHash && utxo.datumHash == datumHash)
  );

export {
  filterUtxos,
  getBalance,
  getContractAddress,
  getDatumHash,
  loadUtxoFromFile,
  readValidator,
  Void,
  VoidDatum,
};
