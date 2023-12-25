use aiken/bytearray
use aiken/dict.{Dict}
use aiken/list.{length}
use aiken/transaction.{InlineDatum, Input, Output, ScriptContext}
use aiken/transaction/credential.{PaymentCredential}
use aiken/transaction/value
use common/addresses.{get_script_address}
use common/types.{Datum, Empty}
use validations/auth.{is_authorized}

pub fn is_output_valid(output: Output) {
  when output.address.stake_credential is {
    None -> True
    _ -> False
  } && when output.datum is {
    InlineDatum(data) -> {
      expect datum: Datum = data
      when datum is {
        Empty -> True
        _ -> False
      }
    }
    _ -> False
  }
}

pub fn get_balance(utxos: List<Output>) -> Dict<ByteArray, Int> {
  list.flat_map(
    utxos,
    fn(output) {
      list.map(
        output.value |> value.without_lovelace |> value.flatten,
        fn(value) { (bytearray.concat(value.1st, value.2nd), value.3rd) },
      )
    },
  )
    |> list.foldl(
         dict.new(),
         fn(token, acc) {
           dict.union_with(
             acc,
             dict.new()
               |> dict.insert(
                    key: token.1st,
                    value: token.2nd,
                    compare: bytearray.compare,
                  ),
             fn(_, balance, output) { Some(balance + output) },
             bytearray.compare,
           )
         },
       )
}

pub fn map_and_validate_input(
  inputs: List<Input>,
  script_address: PaymentCredential,
) -> List<Output> {
  list.filter_map(
    inputs,
    fn(input) {
      if input.output.address.payment_credential == script_address {
        Some(input.output)
      } else {
        None
      }
    },
  )
}

pub fn filter_and_validate_output(
  outputs: List<Output>,
  script_address: PaymentCredential,
) -> List<Output> {
  list.filter(
    outputs,
    fn(output) {
      if output.address.payment_credential == script_address {
        if is_output_valid(output) {
          True
        } else {
          fail
        }
      } else {
        False
      }
    },
  )
}

pub fn can_spend(datum: Datum, context: ScriptContext) -> Bool {
  let script_address = get_script_address(context)

  let cnt_inputs =
    context.transaction.inputs
      |> map_and_validate_input(script_address)
      |> get_balance

  let cnt_outputs =
    context.transaction.outputs
      |> filter_and_validate_output(script_address)
      |> get_balance

  let is_cnt_balance_same_or_greater =
    dict.union_with(
      cnt_outputs,
      cnt_inputs,
      fn(_, output, input) { Some(output - input) },
      bytearray.compare,
    )
      |> dict.values()
      |> list.all(fn(amount) { amount >= 0 })

  let equal_number_of_cnts =
    length(dict.values(cnt_inputs)) == length(dict.values(cnt_outputs))

  is_authorized(datum, context) && equal_number_of_cnts && is_cnt_balance_same_or_greater
}
