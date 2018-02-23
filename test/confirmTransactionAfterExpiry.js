const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")
const ErrorPolicy = artifacts.require("./mocks/ErrorPolicyMock.sol")

contract("InkProtocol", (accounts) => {
  let buyer
  let seller
  let unknown

  beforeEach(async () => {
    buyer = accounts[1]
    seller = accounts[2]
    unknown = accounts[accounts.length - 1]
  })

  describe("#confirmTransactionAfterExpiry()", () => {
    it("fails for buyer", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      await $util.assertVMExceptionAsync(protocol.confirmTransactionAfterExpiry(transaction.id, { from: buyer }))
    })

    it("fails for owner", async () => {
      let {
        protocol,
        transaction,
        policy,
        owner
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted, owner: true
      })

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      await $util.assertVMExceptionAsync(owner.proxyConfirmTransactionAfterExpiry(protocol.address, transaction.id))
    })

    it("fails for mediator", async () => {
      let {
        protocol,
        transaction,
        policy,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      await $util.assertVMExceptionAsync(mediator.proxyConfirmTransactionAfterExpiry(protocol.address, transaction.id))
    })

    it("fails for policy", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      await $util.assertVMExceptionAsync(policy.proxyConfirmTransactionAfterExpiry(protocol.address, transaction.id))
    })

    it("fails for unknown address", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      await $util.assertVMExceptionAsync(protocol.confirmTransactionAfterExpiry(transaction.id, { from: unknown }))
    })

    it("fails when transaction does not exist", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      await $util.assertVMExceptionAsync(protocol.confirmTransactionAfterExpiry(transaction.id + 1, { from: seller }))
    })

    it("fails before transaction expiry", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      let transactionExpiry = await policy.transactionExpiry();
      // Advance time to 10 seconds before expiry. Any closer and risk inconsistent test
      // results. Advancing time does not freeze time so "now" in the VM can be different
      // at each test run.
      $util.advanceTime(transactionExpiry.toNumber() - 10)

      await $util.assertVMExceptionAsync(protocol.confirmTransactionAfterExpiry(transaction.id, { from: seller }))
    })

    it("calls the policy for the transaction expiry", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      // 8 days for transactionExpiry.
      $util.advanceTime(8 * 86400)

      await protocol.confirmTransactionAfterExpiry(transaction.id, { from: seller })
    })

    it("sets transaction expiry to 0 when policy raises an error", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted,
        policy: await ErrorPolicy.new()
      })

      // This passes without the need time advancing since the expiry is 0.
      await protocol.confirmTransactionAfterExpiry(transaction.id, { from: seller })
    })

    it("passes the transaction's amount to the mediator", async () => {
      let {
        protocol,
        transaction,
        mediator,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      let tx = await protocol.confirmTransactionAfterExpiry(transaction.id, { from: seller })
      let event = await $util.eventFromContract(mediator, "ConfirmTransactionAfterExpiryFeeCalled")

      assert.equal(event.args.transactionAmount.toNumber(), transaction.amount)
    })

    it("transfers the mediator fee to the mediator", async () => {
      let {
        protocol,
        transaction,
        mediator,
        policy
      } = await $util.buildTransaction(
        buyer, seller, { finalState: $util.states.Accepted }
      )

      let mediatorFee = 10
      await mediator.setConfirmTransactionAfterExpiryFeeResponse(mediatorFee)

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      let tx = await protocol.confirmTransactionAfterExpiry(transaction.id, { from: seller })
      assert.equal(await $util.getBalance(mediator.address, protocol), mediatorFee)
    })

    it("emits the TransactionConfirmedAfterExpiry event", async () => {
      let {
        protocol,
        transaction,
        mediator,
        policy
      } = await $util.buildTransaction(
        buyer, seller, { finalState: $util.states.Accepted }
      )

      let mediatorFee = 10
      await mediator.setConfirmTransactionAfterExpiryFeeResponse(mediatorFee)

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      let tx = await protocol.confirmTransactionAfterExpiry(transaction.id, { from: seller })

      eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmedAfterExpiry).args
      assert.equal(eventArgs.id.toNumber(), transaction.id)
      assert.equal(eventArgs.mediatorFee, mediatorFee)
    })

    it("transfers the tokens to the seller", async () => {
      let {
        protocol,
        transaction,
        mediator,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      let mediatorFee = 10
      await mediator.setConfirmTransactionAfterExpiryFeeResponse(mediatorFee)

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      let tx = await protocol.confirmTransactionAfterExpiry(transaction.id, { from: seller })

      assert.equal(await $util.getBalance(protocol.address, protocol), 0)
      assert.equal(await $util.getBalance(seller, protocol), transaction.amount - mediatorFee)
    })

    it("collects 0 fee when mediator raises an error", async () => {
      let {
        protocol,
        transaction,
        mediator,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      await mediator.setRaiseError(true)

      let tx = await protocol.confirmTransactionAfterExpiry(transaction.id, { from: seller })
      assert.equal(await $util.getBalance(mediator.address, protocol), 0)
      assert.equal(await $util.getBalance(seller, protocol), transaction.amount)

      let eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmedAfterExpiry).args
      assert.equal(eventArgs.mediatorFee, 0)
    })

    it("collects 0 fee when mediator returns a fee higher than the transaction amount", async () => {
      let {
        protocol,
        transaction,
        mediator,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      // Set the transaction fee higher than the transaction amount.
      let mediatorFee = transaction.amount + 1
      await mediator.setConfirmTransactionAfterExpiryFeeResponse(mediatorFee)

      let transactionExpiry = await policy.transactionExpiry();
      $util.advanceTime(transactionExpiry.toNumber())

      let tx = await protocol.confirmTransactionAfterExpiry(transaction.id, { from: seller })
      assert.equal(await $util.getBalance(mediator.address, protocol), 0)
      assert.equal(await $util.getBalance(seller, protocol), transaction.amount)

      eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmedAfterExpiry).args
      assert.equal(eventArgs.mediatorFee, 0)
    })
  })
})
