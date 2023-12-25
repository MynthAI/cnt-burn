import test from "ava";
import { lock } from "lock";
import { getDatumHash } from "utils";
import { getConfig, getScriptUtxo } from "./config";

test("can lock token", async (t) => {
  const { validator, chainer, lucid, contractAddress, token } =
    await getConfig();
  const script = await getScriptUtxo(chainer, validator);

  await chainer.registerAddress(contractAddress);
  const lockTx = await lock(lucid, { [token]: 1234n }, script);
  chainer.registerTx(lockTx);

  t.pass();
});

test("can lock token with claimer address", async (t) => {
  const { validator, chainer, lucid, contractAddress, token } =
    await getConfig();
  const script = await getScriptUtxo(chainer, validator);
  const address =
    "addr_test1qr5r3e8qtcs0tfjqt3atrh0pxfv745l3f5md4td944cykjpcuz4stnll5v38mwq5hwvlxdkfc83376f3q8af59t8lp9qn0mfg8";

  await chainer.registerAddress(contractAddress);
  const lockTx = await lock(lucid, { [token]: 1234n }, script, address);
  chainer.registerTx(lockTx);

  const lockedUtxo = chainer.getUtxo(lockTx.toHash());
  t.is(lockedUtxo.datumHash, getDatumHash(lucid, address));
});
