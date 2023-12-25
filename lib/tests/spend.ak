use aiken/transaction/value
use assist/addresses
use common/types.{Address, Datum, Empty}
use mocks/mock_tx as mocks
use validations/burn.{can_spend}

// Validate that a tx that withdraw ADA from locked funds are allowed (within include CNT on inputs and outputs)
// - It will pass.
test can_spend_test() {
  let addr = addresses.create_script_address(#"face", #"")
  let ada_token_1 = value.from_lovelace(100)
  let ada_token_2 = value.from_lovelace(50)

  let input = mocks.test_input(address: addr, index: 0, token: ada_token_1)

  let output =
    mocks.test_output_w_datum(address: addr, datum: Empty, token: ada_token_2)

  can_spend(datum: Empty, context: mocks.context([input], [output]))
}

// Validate Validate that a tx that withdraw ADA from locked funds are allowed - case including a invalid signature
// - It will fail.
test can_spend_test_2() {
  let datum: Datum =
    Address {
      owner: #"00000000000000000000000000000000000000000000000000000000",
    }

  let addr = addresses.create_script_address(#"face", #"")
  let ada_token_1 = value.from_lovelace(100)
  let ada_token_2 = value.from_lovelace(50)

  let input = mocks.test_input(address: addr, index: 0, token: ada_token_1)

  let output =
    mocks.test_output_w_datum(address: addr, datum: Empty, token: ada_token_2)

  !can_spend(datum: datum, context: mocks.context([input], [output]))
}

// Validate Validate that a tx that withdraw ADA from locked funds are allowed - case including a valid signature
// - It will pass.
test can_spend_test_3() {
  let datum: Datum = Address { owner: #"010203040506" }

  let addr = addresses.create_script_address(#"face", #"")
  let ada_token_1 = value.from_lovelace(100)
  let ada_token_2 = value.from_lovelace(50)

  let input = mocks.test_input(address: addr, index: 0, token: ada_token_1)

  let output =
    mocks.test_output_w_datum(address: addr, datum: Empty, token: ada_token_2)

  can_spend(datum: datum, context: mocks.context([input], [output]))
}

// Validate that TX have equal CNT balances on input than output (pointing to output_script_address)
// It means that no CNT have been withdraw from the script_address - It will pass.
test can_spend_test_4() {
  // Addresses
  let output_ref_address = addresses.create_script_address(#"face", #"")

  let ada_token = value.from_lovelace(100)
  let cnt_token = value.from_asset(#"acab", #"beef", 40)

  // Inputs / Outputs
  let input_1 =
    mocks.test_input(address: output_ref_address, index: 0, token: ada_token)
  let input_2 =
    mocks.test_input(address: output_ref_address, index: 1, token: cnt_token)

  let output_1 =
    mocks.test_output_w_datum(
      address: output_ref_address,
      datum: Empty,
      token: ada_token,
    )
  let output_2 =
    mocks.test_output_w_datum(
      address: output_ref_address,
      datum: Empty,
      token: cnt_token,
    )
  can_spend(
    datum: Empty,
    context: mocks.context([input_1, input_2], [output_1, output_2]),
  )
}

// Validate that TX have minus quantity of CNT on output than on input (pointing to output_script_address)
// it means that CNT have been withdraw from the script address - It will fail.
test can_spend_test_5() {
  // Addresses
  let output_ref_address = addresses.create_script_address(#"face", #"")

  let ada_token = value.from_lovelace(100)
  let cnt_token_1 = value.from_asset(#"acab", #"beef", 40)
  let cnt_token_2 = value.from_asset(#"acab", #"beef", 20)

  // Inputs / Outputs
  let input_1 =
    mocks.test_input(address: output_ref_address, index: 0, token: ada_token)
  let input_2 =
    mocks.test_input(address: output_ref_address, index: 1, token: cnt_token_1)

  let output_1 =
    mocks.test_output_w_datum(
      address: output_ref_address,
      datum: Empty,
      token: ada_token,
    )
  let output_2 =
    mocks.test_output_w_datum(
      address: output_ref_address,
      datum: Empty,
      token: cnt_token_2,
    )

  !can_spend(
    datum: Empty,
    context: mocks.context([input_1, input_2], [output_1, output_2]),
  )
}

// Validate that TX have more CNTs on output that on input (pointing to output_script_address)
// it means that CNT have been withdraw from the script address - It will fail.
test can_spend_test_6() {
  // Addresses
  let output_ref_address = addresses.create_script_address(#"face", #"")

  let ada_token = value.from_lovelace(100)
  let cnt_token = value.from_asset(#"acab", #"beef", 20)

  // Inputs / Outputs
  let input =
    mocks.test_input(address: output_ref_address, index: 0, token: ada_token)

  let output_1 =
    mocks.test_output_w_datum(
      address: output_ref_address,
      datum: Empty,
      token: ada_token,
    )
  let output_2 =
    mocks.test_output_w_datum(
      address: output_ref_address,
      datum: Empty,
      token: cnt_token,
    )

  !can_spend(
    datum: Empty,
    context: mocks.context([input], [output_1, output_2]),
  )
}

// Validate that TX have equal CNT balances on input than output (pointing to output_script_address)
// but spending all ada of input, it means that no CNT token have been withdraw but all ADA have been withdraw - It will pass.
test can_spend_test_7() {
  // Addresses
  let output_ref_address = addresses.create_script_address(#"face", #"")

  let ada_token = value.from_lovelace(100)
  let cnt_token = value.from_asset(#"acab", #"beef", 40)

  // Inputs / Outputs
  let input_1 =
    mocks.test_input(address: output_ref_address, index: 0, token: ada_token)
  let input_2 =
    mocks.test_input(address: output_ref_address, index: 1, token: cnt_token)

  let output =
    mocks.test_output_w_datum(
      address: output_ref_address,
      datum: Empty,
      token: cnt_token,
    )

  can_spend(datum: Empty, context: mocks.context([input_1, input_2], [output]))
}

// Validate that TX have more quantity of CNT on outputs than input of CNT balances (pointing to output_script_address)
// It means that the smart contract has received more quantity of an existing token on the actual UTXO - It will pass.
test can_spend_test_8() {
  // Addresses
  let output_ref_address = addresses.create_script_address(#"face", #"")

  let ada_token = value.from_lovelace(100)
  let cnt_token_1 = value.from_asset(#"acab", #"beef", 20)
  let cnt_token_2 = value.from_asset(#"acab", #"beef", 40)

  // Inputs / Outputs
  let input_1 =
    mocks.test_input(address: output_ref_address, index: 0, token: ada_token)
  let input_2 =
    mocks.test_input(address: output_ref_address, index: 1, token: cnt_token_1)

  let output_1 =
    mocks.test_output_w_datum(
      address: output_ref_address,
      datum: Empty,
      token: ada_token,
    )
  let output_2 =
    mocks.test_output_w_datum(
      address: output_ref_address,
      datum: Empty,
      token: cnt_token_2,
    )

  can_spend(
    datum: Empty,
    context: mocks.context([input_1, input_2], [output_1, output_2]),
  )
}
