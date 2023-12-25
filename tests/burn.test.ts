import path from "path";
import test from "ava";
import { burn } from "burn";
import { claim } from "claim";
import { lock } from "lock";
import { getDirname } from "mynth-helper";
import { getContractAddress, loadUtxoFromFile } from "utils";
import { getConfig, getScriptUtxo } from "./config";

const dirname = getDirname(import.meta.url);

test("can burn CNT", async (t) => {
  const { validator, chainer, lucid, contractAddress, token } =
    await getConfig();
  const script = await getScriptUtxo(chainer, validator);

  // One lock and claim has to occur first before burning works
  // properly
  await chainer.registerAddress(contractAddress);
  const lockTx = await lock(
    lucid,
    { lovelace: 5000000n, [token]: 1234n },
    script
  );
  chainer.registerTx(lockTx);

  const claimTx = await claim(lucid, chainer.getUtxos(contractAddress), script);
  chainer.registerTx(claimTx);

  // Now we can burn
  const burnTx = await burn(
    lucid,
    chainer.getUtxos(contractAddress),
    { [token]: 1234n },
    script
  );
  chainer.registerTx(burnTx);

  t.pass();
});

test("can burn CNT using saved reference UTXO", async (t) => {
  const { chainer, lucid, token } = await getConfig();
  const validator = await loadUtxoFromFile(path.join(dirname, "cnt-burn.json"));
  const contractAddress = getContractAddress(lucid, validator);
  await chainer.registerAddress(contractAddress);

  const burnTx = await burn(
    lucid,
    chainer.getUtxos(contractAddress),
    { [token]: 1234n },
    validator
  );
  chainer.registerTx(burnTx);

  t.pass();
});
