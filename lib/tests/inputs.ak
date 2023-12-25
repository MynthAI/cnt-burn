use aiken/transaction/credential.{ScriptCredential} as credentials
use aiken/transaction/value
use assist/addresses as addr
use mocks/mock_tx as mocks
use validations/burn.{map_and_validate_input}

// If a list of inputs is provided and none of them points to a script addres then it returns a empty list.
test map_and_validate_input_test() {
  // address with a empty stake_credential  
  let input_script_address = addr.create_script_address(#"face", #"")
  let script_address = ScriptCredential(#"acab")

  let input =
    mocks.test_input(
      address: input_script_address,
      index: 0,
      token: value.from_lovelace(100),
    )

  let input_found = map_and_validate_input([input], script_address)

  input_found == []
}

// If a list of inputs is provided and one of them points to a script address and has an output, then it returns the expected input.
test map_and_validate_input_test_1() {
  // address with a empty stake_credential  
  let input_script_address = addr.create_script_address(#"acab", #"")
  let script_address = ScriptCredential(#"acab")

  let input =
    mocks.test_input(
      address: input_script_address,
      index: 0,
      token: value.from_lovelace(100),
    )
  let output =
    mocks.test_output(
      address: input_script_address,
      token: value.from_lovelace(100),
    )

  let input_found = map_and_validate_input([input], script_address)

  input_found == [output]
}
