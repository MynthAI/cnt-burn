use aiken/transaction.{ScriptContext, Spend}
use aiken/transaction/credential.{PaymentCredential}

// Find the address of this script
pub fn get_script_address(context: ScriptContext) -> PaymentCredential {
  expect Spend(reference) = context.purpose
  expect Some(script_input) =
    transaction.find_input(context.transaction.inputs, reference)
  script_input.output.address.payment_credential
}
