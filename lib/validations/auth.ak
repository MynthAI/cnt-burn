use aiken/list
use aiken/transaction.{ScriptContext}
use common/types.{Address, Datum, Empty}

// UTXOs can be locked to allow only a specific wallet address to
// claim ADA. Only allow spending if either no datum has been set
// or the datum matches the user's signature.
pub fn is_authorized(datum: Datum, context: ScriptContext) {
  when datum is {
    Address { owner } -> list.has(context.transaction.extra_signatories, owner)
    Empty -> True
  }
}
