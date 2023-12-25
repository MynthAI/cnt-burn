use aiken/transaction/credential.{ScriptCredential} as credentials
use aiken/transaction/value
use assist/addresses as addr
use common/types.{Address, Datum, Empty}
use mocks/mock_tx as mocks
use validations/burn.{filter_and_validate_output, is_output_valid}

// If a valid stake_credential are sent then return false.
test is_output_valid_test() {
  // address with a valid stake_credential  
  let address = addr.create_address(#"acab", #"face")

  let output =
    mocks.test_output_w_datum(
      address,
      datum: Empty,
      token: value.from_lovelace(100),
    )

  !is_output_valid(output)
}

// If a empty stake_credential is sent and a output contains a empty datum then return true.
test is_output_valid_test_1() {
  // address with a empty stake_credential  
  let address = addr.create_address(#"acab", #"")

  let output =
    mocks.test_output_w_datum(
      address,
      datum: Empty,
      token: value.from_lovelace(100),
    )

  is_output_valid(output)
}

// If a empty stake_credential is sent and a output contains valid datum then return false.
test is_output_valid_test_2() {
  let test_datum: Datum =
    Address {
      owner: #"00000000000000000000000000000000000000000000000000000000",
    }

  // address with a empty stake_credential  
  let address = addr.create_address(#"acab", #"")

  let output =
    mocks.test_output_w_datum(
      address,
      datum: test_datum,
      token: value.from_lovelace(100),
    )

  !is_output_valid(output)
}

// If a list of outputs is passed but none of the outputs points to an "address.payment_credential" it returns an empty list
test filter_and_validate_output_test() {
  // address with a empty stake_credential  
  let output_script_address = addr.create_script_address(#"face", #"")
  let script_address = ScriptCredential(#"acab")

  let output =
    mocks.test_output(
      address: output_script_address,
      token: value.from_lovelace(100),
    )

  let output_found = filter_and_validate_output([output], script_address)

  output_found == []
}

// If a list of outputs is passed and one points to an "address.payment_credential" and contains an invalid output, it trows an error
test filter_and_validate_output_test_1() fail {
  // address with a empty stake_credential  
  let output_script_address = addr.create_script_address(#"acab", #"")
  let script_address = ScriptCredential(#"acab")

  // * Invalid output, because this has incorrect Datum format *
  let output =
    mocks.test_output(
      address: output_script_address,
      token: value.from_lovelace(100),
    )

  let output_found = filter_and_validate_output([output], script_address)

  output_found == []
}

// If a list of outputs is passed and one points to a "address.payment_credential" and contains a valid output, it returns a expected output
test filter_and_validate_output_test_2() {
  // address with a empty stake_credential  
  let output_script_address = addr.create_script_address(#"acab", #"")
  let script_address = ScriptCredential(#"acab")

  // * Valid output, because this has correct Datum format *
  let output =
    mocks.test_output_w_datum(
      address: output_script_address,
      datum: Empty,
      token: value.from_lovelace(100),
    )

  let output_found = filter_and_validate_output([output], script_address)

  output_found == [output]
}
