const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")
const ErrorPolicy = artifacts.require("./mocks/ErrorPolicyMock.sol")
const Policy = artifacts.require("./mocks/PolicyMock.sol")

contract("InkProtocol", (accounts) => {
  let buyer,
      seller,
      unknown

  beforeEach(() => {
    buyer = accounts[1]
    seller = accounts[2]
    unknown = accounts[accounts.length - 1]
  })

  describe("#refundTransactionAfterExpiry()", () => {
    it("fails for seller", async () => {
      let {
        policy,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await $util.assertVMExceptionAsync(protocol.refundTransactionAfterExpiry(transaction.id, { from: seller }))
    })

    it("fails for owner", async () => {
      let {
        policy,
        owner,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed,
        owner: true
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await $util.assertVMExceptionAsync(owner.proxyRefundTransactionAfterExpiry(protocol.address, transaction.id))
    })

    it("fails for mediator", async () => {
      let {
        policy,
        mediator,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await $util.assertVMExceptionAsync(mediator.proxyRefundTransactionAfterExpiry(protocol.address, transaction.id))
    })

    it("fails for policy", async () => {
      let {
        policy,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await $util.assertVMExceptionAsync(policy.proxyRefundTransactionAfterExpiry(protocol.address, transaction.id))
    })

    it("fails for unknown address", async () => {
      let {
        policy,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await $util.assertVMExceptionAsync(protocol.refundTransactionAfterExpiry(transaction.id, { from: unknown }))
    })

    it("fails when transaction does not exist", async () => {
      let protocol = await InkProtocol.new()
      let policy = await Policy.new()

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await $util.assertVMExceptionAsync(protocol.refundTransactionAfterExpiry(0, {from: buyer}))
    })

    it("fails before escalation expiry", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      await $util.assertVMExceptionAsync(protocol.refundTransactionAfterExpiry(transaction.id, { from: buyer }))
    })

    it("calls the policy for the escalation expiry", async () => {
      let {
        policy,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await protocol.refundTransactionAfterExpiry(transaction.id, { from: buyer })
    })

    it("sets escalation expiry to 0 when policy raises an error", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed,
        policy: await ErrorPolicy.new()
      })

      await protocol.refundTransactionAfterExpiry(transaction.id, { from: buyer })
    })

    it("passes the transaction's amount to the mediator", async () => {
      let {
        policy,
        mediator,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await mediator.setRefundTransactionAfterExpiryFeeResponse(10)
      await protocol.refundTransactionAfterExpiry(transaction.id, { from: buyer })

      let event = await $util.eventFromContract(mediator, "RefundTransactionAfterExpiryFeeCalled")
      assert.equal(event.args.transactionAmount.toNumber(), transaction.amount.toNumber())
    })

    it("transfers the mediator fee to the mediator", async () => {
      let mediatorFee = 10

      let {
        policy,
        mediator,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await mediator.setRefundTransactionAfterExpiryFeeResponse(mediatorFee)
      await protocol.refundTransactionAfterExpiry(transaction.id, { from: buyer })

      assert.equal(await $util.getBalance(protocol.address, protocol), 0)
      assert.equal(await $util.getBalance(mediator.address, protocol), mediatorFee)
    })

    it("emits the TransactionRefundedAfterExpiry event", async () => {
      let {
        policy,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      let tx = await protocol.refundTransactionAfterExpiry(transaction.id, { from: buyer })
      let eventArgs = $util.eventFromTx(tx, $util.events.TransactionRefundedAfterExpiry).args

      assert.equal(eventArgs.id, transaction.id)
    })

    it("transfers the tokens to the buyer", async () => {
      let mediatorFee = 10

      let {
        policy,
        mediator,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await mediator.setRefundTransactionAfterExpiryFeeResponse(mediatorFee)
      await protocol.refundTransactionAfterExpiry(transaction.id, { from: buyer })

      assert.equal(await $util.getBalance(protocol.address, protocol), 0)
      assert.equal(await $util.getBalance(buyer, protocol), transaction.amount - mediatorFee)
    })

    it("collects 0 fee when mediator raises an error", async () => {
      let {
        policy,
        mediator,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await mediator.setRaiseError(true)
      await protocol.refundTransactionAfterExpiry(transaction.id, { from: buyer })

      assert.equal(await $util.getBalance(mediator.address, protocol), 0)
    })

    it("collects 0 fee when mediator returns a fee higher than the transaction amount", async () => {
      let {
        policy,
        mediator,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      $util.advanceTime((await policy.escalationExpiry()).toNumber())

      await mediator.setRefundTransactionAfterExpiryFeeResponse(transaction.amount + 1)
      await protocol.refundTransactionAfterExpiry(transaction.id, { from: buyer })

      assert.equal(await $util.getBalance(mediator.address, protocol), 0)
    })
  })
})
