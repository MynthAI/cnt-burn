import test from "ava";
import { Data, SpendingValidator } from "lucid-cardano";
import { getContractAddress } from "utils";
import { getConfig, getScriptUtxo } from "./config";

const alwaysSucceedScript: SpendingValidator = {
  type: "PlutusV2",
  script: "49480100002221200101",
};

test("can deploy validator", async (t) => {
  const { chainer, lucid } = await getConfig();
  const contractAddress = lucid.utils.validatorToAddress(alwaysSucceedScript);

  const scriptUtxo = await getScriptUtxo(chainer, alwaysSucceedScript);

  const fundTx = await (
    await lucid
      .newTx()
      .payToContract(
        contractAddress,
        { inline: Data.void() },
        { lovelace: 5000000n }
      )
      .complete()
  )
    .sign()
    .complete();
  await chainer.registerAddress(contractAddress);
  chainer.registerTx(fundTx);

  const utxos = chainer
    .getUtxos(contractAddress)
    .filter((utxo) => utxo.datum !== undefined);

  const withdrawTx = await (
    await lucid
      .newTx()
      .collectFrom(utxos, Data.void())
      .readFrom([scriptUtxo])
      .payToAddress(await lucid.wallet.address(), { lovelace: 2000000n })
      .complete()
  )
    .sign()
    .complete();
  chainer.registerTx(withdrawTx);

  t.pass();
});

test("getContractAddress returns correct known address", async (t) => {
  const { chainer, lucid } = await getConfig();
  const scriptUtxo = await getScriptUtxo(chainer, alwaysSucceedScript);
  const address = getContractAddress(lucid, scriptUtxo);

  t.is(
    address,
    "addr_test1wqag3rt979nep9g2wtdwu8mr4gz6m4kjdpp5zp705km8wys6t2kla"
  );
});

test("getContractAddress returns correct validator address", async (t) => {
  const { validator, chainer, lucid } = await getConfig();
  const contractAddress = lucid.utils.validatorToAddress(validator);
  const scriptUtxo = await getScriptUtxo(chainer, validator);
  const address = getContractAddress(lucid, scriptUtxo);

  t.is(address, contractAddress);
});
