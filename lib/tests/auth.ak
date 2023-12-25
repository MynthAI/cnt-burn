use common/types.{Address, Datum, Empty}
use mocks/mock_tx as mocks
use validations/auth.{is_authorized}

// If a datum are not passed, then return true.
test is_authorized_test() {
  let datum = Empty
  let context = mocks.context([], [])

  is_authorized(datum, context)
}

// If a datum are passed with a incorrect owner, it retuns false.
test is_authorized_test_1() {
  let datum: Datum =
    Address {
      owner: #"00000000000000000000000000000000000000000000000000000000",
    }
  let context = mocks.context([], [])

  !is_authorized(datum, context)
}

// If a datum are passed with a correct owner, it retuns true.
test is_authorized_test_2() {
  // #"010203040506" is the signature attached into the mocked context.
  let datum: Datum = Address { owner: #"010203040506" }
  let context = mocks.context([], [])

  is_authorized(datum, context)
}
