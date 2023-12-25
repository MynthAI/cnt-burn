import { Address, Assets, Lucid, UTxO } from "lucid-cardano";
import { getContractAddress, getDatumHash, VoidDatum } from "utils";

const lock = async (
  lucid: Lucid,
  tokens: Assets,
  validator: UTxO,
  adaClaimer?: Address
) => {
  const contractAddress = getContractAddress(lucid, validator);
  const datum = adaClaimer
    ? { hash: getDatumHash(lucid, adaClaimer) }
    : VoidDatum;

  const tx = await lucid
    .newTx()
    .payToContract(contractAddress, datum, tokens)
    .complete();

  return tx.sign().complete();
};

export { lock };
