const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")
const Mediator = artifacts.require("./mocks/MediatorMock.sol")

contract("InkProtocol", (accounts) => {
  let buyer,
      seller,
      unknown

  beforeEach(async () => {
    buyer = accounts[1]
    seller = accounts[2]
    unknown = accounts[accounts.length - 1]
  })

  describe("#confirmTransactionByMediator()", () => {
    it("fails for buyer", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await $util.assertVMExceptionAsync(protocol.confirmTransactionByMediator(transaction.id, { from: buyer }))
    })

    it("fails for seller", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await $util.assertVMExceptionAsync(protocol.confirmTransactionByMediator(transaction.id, { from: seller }))
    })

    it("fails for owner", async () => {
      let {
        protocol,
        transaction,
        owner
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        owner: true
      })

      await $util.assertVMExceptionAsync(owner.proxyConfirmTransactionByMediator(protocol.address, transaction.id))
    })

    it("fails for policy", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await $util.assertVMExceptionAsync(policy.proxyConfirmTransactionByMediator(protocol.address, transaction.id))
    })

    it("fails for unknown address", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await $util.assertVMExceptionAsync(protocol.confirmTransactionByMediator(transaction.id, { from: unknown }))
    })

    it("fails when transaction does not exist", async () => {
      let protocol = await InkProtocol.new()
      let mediator = await Mediator.new()

      await $util.assertVMExceptionAsync(mediator.confirmTransaction(protocol.address, 0))
    })

    it("fails when mediator raises an error", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await mediator.setRaiseError(true)

      await $util.assertVMExceptionAsync(mediator.confirmTransaction(protocol.address, transaction.id))
    })

    it("fails when mediator returns a fee greater than transaction amount", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await mediator.setConfirmTransactionByMediatorFeeResponse(transaction.amount + 1)

      await $util.assertVMExceptionAsync(mediator.confirmTransaction(protocol.address, transaction.id))
    })

    it("passes the transaction's amount to the mediator", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await mediator.confirmTransaction(protocol.address, transaction.id)

      let event = await $util.eventFromContract(mediator, "ConfirmTransactionByMediatorFeeCalled")
      assert.equal(event.args.transactionAmount.toNumber(), transaction.amount)
    })

    it("transfers the mediator fee to the mediator", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      let mediatorFee = 10
      await mediator.setConfirmTransactionByMediatorFeeResponse(mediatorFee)
      await mediator.confirmTransaction(protocol.address, transaction.id)

      assert.equal(await $util.getBalance(protocol.address, protocol), 0)
      assert.equal(await $util.getBalance(mediator.address, protocol), mediatorFee)
    })

    it("transfers the tokens to the seller", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      let mediatorFee = 10
      await mediator.setConfirmTransactionByMediatorFeeResponse(mediatorFee)
      await mediator.confirmTransaction(protocol.address, transaction.id)

      assert.equal(await $util.getBalance(protocol.address, protocol), 0)
      assert.equal(await $util.getBalance(seller, protocol), transaction.amount - mediatorFee)
    })

    it("emits the TransactionConfirmedByMediator event", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      let mediatorFee = 10
      await mediator.setConfirmTransactionByMediatorFeeResponse(mediatorFee)
      await mediator.confirmTransaction(protocol.address, transaction.id)

      let event = await $util.eventFromContract(protocol, $util.events.TransactionConfirmedByMediator)
      assert.equal(event.args.id.toNumber(), transaction.id)
      assert.equal(event.args.mediatorFee.toNumber(), mediatorFee)
    })
  })
})
