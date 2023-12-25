use aiken/transaction.{ScriptContext}
use common/types.{Datum}
use validations/burn.{can_spend}

// CNTs sent to this validator are forever locked. The validator
// only allows withdrawing of ADA, disallowing all other
// withdrawals.
validator {
  fn validate(datum: Datum, _redeemer, context: ScriptContext) {
    can_spend(datum, context)
  }
}
