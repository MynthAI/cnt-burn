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
import {
  getBlockfrostApi,
  getLucid,
  getStakeKey,
  invariant,
} from "mynth-helper";
import { Err, Ok, Result } from "ts-res";

const Void = "d87a80";
const VoidDatum = { inline: Void };

const getBalance = (utxos: UTxO[]) => {
  return utxos.reduce((balances, utxo) => {
    Object.entries(utxo.assets).forEach(([assetId, balance]) => {
      balances[assetId] = (balances[assetId] || 0n) + balance;
    });

    return balances;
  }, {} as Assets);
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

const getDatum = (lucid: Lucid, address: Address) => {
  const details = lucid.utils.getAddressDetails(address);
  invariant(
    details.paymentCredential,
    `Could not determine address from ${address}`
  );

  return Data.to(new Constr(0, [details.paymentCredential.hash]));
};

const getDatumHash = (lucid: Lucid, address: Address) => {
  const datum = getDatum(lucid, address);

  return C.hash_plutus_data(C.PlutusData.from_bytes(fromHex(datum))).to_hex();
};

const filterUtxos = (utxos: UTxO[], datumHash?: string) =>
  utxos.filter(
    (utxo) => utxo.datum == Void || (datumHash && utxo.datumHash == datumHash)
  );

const loadLucidFromAddress = async (
  blockfrostApiKey: string,
  address: string
) => {
  const blockfrost = getBlockfrostApi(blockfrostApiKey);
  const [addresses, lucid] = await Promise.all([
    blockfrost.accountsAddresses(getStakeKey(address)),
    getLucid(blockfrostApiKey),
  ]);

  const utxos = (
    await Promise.all(
      addresses.map((address) => lucid.utxosAt(address.address))
    )
  ).flat();

  lucid.selectWalletFrom({ address, utxos });
  return lucid;
};

const processError = async <T>(
  l: () => Promise<T>
): Promise<Result<T, string>> => {
  try {
    return Ok(await l());
  } catch (error) {
    if (typeof error === "string") {
      return Err(error);
    } else if (error instanceof Error) {
      return Err(error.message);
    } else {
      return Err(JSON.stringify(error));
    }
  }
};

export {
  filterUtxos,
  getBalance,
  getContractAddress,
  getDatum,
  getDatumHash,
  loadLucidFromAddress,
  loadUtxoFromFile,
  processError,
  readValidator,
  Void,
  VoidDatum,
};
