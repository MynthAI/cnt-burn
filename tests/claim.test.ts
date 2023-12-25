import test from "ava";
import { claim } from "claim";
import { lock } from "lock";
import { Data } from "lucid-cardano";
import { invariant } from "mynth-helper";
import { filterUtxos, getDatumHash, VoidDatum } from "utils";
import { getConfig, getScriptUtxo } from "./config";

test("can claim ADA", async (t) => {
  const { validator, chainer, lucid, contractAddress, token } =
    await getConfig();
  const script = await getScriptUtxo(chainer, validator);

  await chainer.registerAddress(contractAddress);
  const lockTx = await lock(
    lucid,
    { lovelace: 5000000n, [token]: 1234n },
    script
  );
  chainer.registerTx(lockTx);

  const claimTx = await claim(lucid, chainer.getUtxos(contractAddress), script);
  chainer.registerTx(claimTx);

  t.pass();
});

test("cannot claim ADA designated for another address", async (t) => {
  const { validator, chainer, lucid, contractAddress, token } =
    await getConfig();
  const script = await getScriptUtxo(chainer, validator);

  await chainer.registerAddress(contractAddress);
  const lockTx = await lock(
    lucid,
    { lovelace: 5000000n, [token]: 1234n },
    script,
    "addr_test1qqy9vhsk3809hh9eld5pm2zwatyh9msksycwtqklkq6ect6ru4l2fvr5fhhn3wnj6wnvkg8s4ckszn50l290ze0uyn9qaleq2d"
  );
  chainer.registerTx(lockTx);

  try {
    await claim(lucid, chainer.getUtxos(contractAddress), script);
    t.fail("Contract allows claiming ADA");
  } catch (error) {
    t.pass();
  }
});

test("can claim ADA designated for address with signature", async (t) => {
  const { validator, chainer, lucid, contractAddress, token } =
    await getConfig();
  const script = await getScriptUtxo(chainer, validator);
  const address = await lucid.wallet.address();

  await chainer.registerAddress(contractAddress);
  const lockTx = await lock(
    lucid,
    { lovelace: 5000000n, [token]: 1234n },
    script,
    address
  );
  chainer.registerTx(lockTx);

  const claimTx = await claim(lucid, chainer.getUtxos(contractAddress), script);
  chainer.registerTx(claimTx);

  t.pass();
});

test("cannot mix ADA designated for other addresses", async (t) => {
  const { validator, chainer, lucid, contractAddress } = await getConfig();
  const script = await getScriptUtxo(chainer, validator);
  const address = await lucid.wallet.address();
  const otherAddress =
    "addr_test1qqy9vhsk3809hh9eld5pm2zwatyh9msksycwtqklkq6ect6ru4l2fvr5fhhn3wnj6wnvkg8s4ckszn50l290ze0uyn9qaleq2d";

  await chainer.registerAddress(contractAddress);
  chainer.registerTx(
    await lock(lucid, { lovelace: 5000000n }, script, otherAddress)
  );

  chainer.registerTx(await lock(lucid, { lovelace: 5000000n }, script));
  chainer.registerTx(
    await lock(lucid, { lovelace: 5000000n }, script, address)
  );

  const claimAllTx = lucid
    .newTx()
    .collectFrom(
      Array.from(
        new Set([
          ...filterUtxos(
            chainer.getUtxos(contractAddress),
            getDatumHash(lucid, address)
          ),
          ...filterUtxos(
            chainer.getUtxos(contractAddress),
            getDatumHash(lucid, otherAddress)
          ),
        ])
      ),
      Data.void()
    )
    .readFrom([script])
    .addSigner(address);

  try {
    await claimAllTx.complete();
    t.fail("Contract allows claiming someone else's ADA");
    return;
  } catch (error) {
    t.pass();
  }

  await lucid
    .newTx()
    .collectFrom(
      filterUtxos(
        chainer.getUtxos(contractAddress),
        getDatumHash(lucid, address)
      ).filter((utxo) => Object.keys(utxo.assets).length == 1),
      Data.void()
    )
    .readFrom([script])
    .addSigner(address)
    .complete();
});

test("cannot claim CNT", async (t) => {
  const { validator, chainer, lucid, contractAddress, token } =
    await getConfig();
  const script = await getScriptUtxo(chainer, validator);

  await chainer.registerAddress(contractAddress);
  const lockTx = await lock(lucid, { [token]: 1234n }, script);
  chainer.registerTx(lockTx);

  const claimTx = lucid
    .newTx()
    .collectFrom(filterUtxos(chainer.getUtxos(contractAddress)), Data.void())
    .readFrom([script]);

  try {
    await claimTx.complete();
    t.fail("Contract allows spending of CNT");
  } catch (error) {
    t.pass();
  }
});

test("cannot claim everything", async (t) => {
  const { validator, chainer, lucid, contractAddress, token } =
    await getConfig();
  const script = await getScriptUtxo(chainer, validator);

  await chainer.registerAddress(contractAddress);
  const lockTx = await lock(
    lucid,
    { lovelace: 5000000n, [token]: 1234n },
    script
  );
  chainer.registerTx(lockTx);

  const claimTx = lucid
    .newTx()
    .collectFrom(filterUtxos(chainer.getUtxos(contractAddress)), Data.void())
    .readFrom([script]);

  try {
    await claimTx.complete();
    t.fail("Contract allows spending of CNT");
  } catch (error) {
    t.pass();
  }
});

test("cannot claim some tokens", async (t) => {
  const { validator, chainer, lucid, contractAddress, token } =
    await getConfig();
  const script = await getScriptUtxo(chainer, validator);

  await chainer.registerAddress(contractAddress);
  const lockTx = await lock(
    lucid,
    { lovelace: 5000000n, [token]: 1234n },
    script
  );
  chainer.registerTx(lockTx);

  const claimTx = lucid
    .newTx()
    .collectFrom(filterUtxos(chainer.getUtxos(contractAddress)), Data.void())
    .payToContract(contractAddress, VoidDatum, { [token]: 123n })
    .readFrom([script]);

  try {
    await claimTx.complete();
    t.fail("Contract allows spending of CNT");
  } catch (error) {
    t.pass();
  }
});

test("cannot claim some tokens from multiple inputs", async (t) => {
  const { validator, chainer, lucid, contractAddress, token } =
    await getConfig();
  const script = await getScriptUtxo(chainer, validator);

  const lockToken = async () => {
    const tx = await lock(
      lucid,
      { lovelace: 5000000n, [token]: 1234n },
      script
    );
    chainer.registerTx(tx);
    return chainer.getUtxo(tx.toHash());
  };

  await chainer.registerAddress(contractAddress);
  const utxos = [await lockToken(), await lockToken()];

  // Check that we can't steal from one of the inputs
  const claimTx = lucid
    .newTx()
    .collectFrom(utxos, Data.void())
    .payToContract(contractAddress, VoidDatum, { [token]: 1235n })
    .readFrom([script]);

  try {
    await claimTx.complete();
    t.fail("Contract allows spending of CNT");
  } catch (error) {
    t.pass();
  }

  // We should be allowed to reshuffle and claim ADA, as all CNT
  // remains locked
  await lucid
    .newTx()
    .collectFrom(utxos, Data.void())
    .payToContract(contractAddress, VoidDatum, { [token]: 2468n })
    .readFrom([script])
    .complete();
});

test("cannot set datum on claim", async (t) => {
  const { validator, chainer, lucid, contractAddress } = await getConfig();
  const script = await getScriptUtxo(chainer, validator);

  await chainer.registerAddress(contractAddress);
  const lockTx = await lock(lucid, { lovelace: 5000000n }, script);
  chainer.registerTx(lockTx);

  const claimTx = lucid
    .newTx()
    .collectFrom([chainer.getUtxo(lockTx.toHash())], Data.void())
    .payToContract(
      contractAddress,
      { hash: getDatumHash(lucid, await lucid.wallet.address()) },
      { lovelace: 2000n }
    )
    .readFrom([script]);

  try {
    await claimTx.complete();
    t.fail("Contract allows relocking ADA");
  } catch (error) {
    t.pass();
  }

  await lucid
    .newTx()
    .collectFrom([chainer.getUtxo(lockTx.toHash())], Data.void())
    .payToContract(contractAddress, VoidDatum, { lovelace: 2000n })
    .readFrom([script])
    .complete();
});

test("cannot attach staking key during claim", async (t) => {
  const { contractAddress, chainer, validator, lucid } = await getConfig();
  const script = await getScriptUtxo(chainer, validator);
  const address = await lucid.wallet.address();
  const stakeCreds = lucid.utils.getAddressDetails(address);
  invariant(stakeCreds.stakeCredential);

  const stakedContractAddress = lucid.utils.validatorToAddress(
    validator,
    stakeCreds.stakeCredential
  );

  await chainer.registerAddress(contractAddress);
  await chainer.registerAddress(stakedContractAddress);
  const lockTx = await (
    await lucid
      .newTx()
      .payToContract(stakedContractAddress, VoidDatum, { lovelace: 10000000n })
      .complete()
  )
    .sign()
    .complete();
  chainer.registerTx(lockTx);

  const stakedLockTx = await (
    await lucid
      .newTx()
      .payToContract(stakedContractAddress, VoidDatum, { lovelace: 10000000n })
      .complete()
  )
    .sign()
    .complete();
  chainer.registerTx(stakedLockTx);

  const utxos = [
    chainer.getUtxo(lockTx.toHash()),
    chainer.getUtxo(stakedLockTx.toHash()),
  ];
  const claimTx = lucid
    .newTx()
    .collectFrom(utxos, Data.void())
    .payToContract(stakedContractAddress, VoidDatum, { lovelace: 2000n })
    .readFrom([script]);

  try {
    await claimTx.complete();
    t.fail("Contract allows attaching stake key");
  } catch (error) {
    t.pass();
  }

  lucid
    .newTx()
    .collectFrom(utxos, Data.void())
    .payToContract(lucid.utils.validatorToAddress(validator), VoidDatum, {
      lovelace: 2000n,
    })
    .readFrom([script])
    .complete();
});
