const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")
const MediatorMock = artifacts.require("./mocks/MediatorMock.sol")

contract("InkProtocol", (accounts) => {
  let buyer,
      seller,
      unknown,
      buyerAmount,
      sellerAmount

  beforeEach(() => {
    buyer = accounts[1]
    seller = accounts[2]
    unknown = accounts[accounts.length - 1]
    buyerAmount = 50
    sellerAmount = 50
  })

  describe("#settleTransactionByMediator()", () => {
    it("fails for buyer", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await $util.assertVMExceptionAsync(protocol.settleTransactionByMediator(transaction.id, buyerAmount, sellerAmount, { from: buyer }))
    })

    it("fails for seller", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await $util.assertVMExceptionAsync(protocol.settleTransactionByMediator(transaction.id, buyerAmount, sellerAmount, { from: seller }))
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

      await $util.assertVMExceptionAsync(owner.proxySettleTransactionByMediator(protocol.address, transaction.id, buyerAmount, sellerAmount))
    })

    it("fails for policy", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await $util.assertVMExceptionAsync(policy.proxySettleTransactionByMediator(protocol.address, transaction.id, buyerAmount, sellerAmount))
    })

    it("fails for unknown address", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await $util.assertVMExceptionAsync(protocol.settleTransactionByMediator(transaction.id, buyerAmount, sellerAmount, { from: unknown }))
    })

    it("fails when transaction does not exist", async () => {
      let protocol = await InkProtocol.new()
      let mediator = await MediatorMock.new()

      await $util.assertVMExceptionAsync(mediator.settleTransaction(protocol.address, 0, buyerAmount, sellerAmount))
    })

    it("fails when buyerAmount and sellerAmount does not add up to transaction amount", async () => {
      let transactionAmount = 100
      buyerAmount = 49
      sellerAmount = 50

      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        amount: transactionAmount
      })

      await $util.assertVMExceptionAsync(mediator.settleTransaction(protocol.address, transaction.id, buyerAmount, sellerAmount))
    })

    it("fails when buyerAmount and sellerAmount adds to more than transaction amount", async () => {
      let transactionAmount = 100
      buyerAmount = 51
      sellerAmount = 50

      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        amount: transactionAmount
      })

      await $util.assertVMExceptionAsync(mediator.settleTransaction(protocol.address, transaction.id, buyerAmount, sellerAmount))
    })

    it("fails when mediator raises an error", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        amount: buyerAmount + sellerAmount
      })

      await mediator.setRaiseError(true)

      await $util.assertVMExceptionAsync(mediator.settleTransaction(protocol.address, transaction.id, buyerAmount, sellerAmount))
    })

    it("fails when mediator returns a buyer's fee that is greater than buyer's amount", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        amount: buyerAmount + sellerAmount
      })

      await mediator.setSettleTransactionByMediatorFeeResponseForBuyer(buyerAmount + 1)

      await $util.assertVMExceptionAsync(mediator.settleTransaction(protocol.address, transaction.id, buyerAmount, sellerAmount))
    })

    it("fails when mediator returns a seller's fee that is greater than seller's amount", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        amount: buyerAmount + sellerAmount
      })

      await mediator.setSettleTransactionByMediatorFeeResponseForSeller(sellerAmount + 1)

      await $util.assertVMExceptionAsync(mediator.settleTransaction(protocol.address, transaction.id, buyerAmount, sellerAmount))
    })

    it("passes the buyer's and seller's amount to the mediator", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        amount: buyerAmount + sellerAmount
      })

      await mediator.settleTransaction(protocol.address, transaction.id, buyerAmount, sellerAmount)

      let event = await $util.eventFromContract(protocol, $util.events.TransactionSettledByMediator)
      let eventArgs = event.args
      assert.equal(eventArgs.id, transaction.id)
      assert.equal(eventArgs.buyerAmount.toNumber(), buyerAmount)
      assert.equal(eventArgs.sellerAmount.toNumber(), sellerAmount)
    })

    it("transfers the mediator fees to the mediator", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        amount: buyerAmount + sellerAmount
      })

      let buyerFee = 5
      let sellerFee = 10

      await mediator.setSettleTransactionByMediatorFeeResponseForBuyer(buyerFee)
      await mediator.setSettleTransactionByMediatorFeeResponseForSeller(sellerFee)
      await mediator.settleTransaction(protocol.address, transaction.id, buyerAmount, sellerAmount)

      assert.equal(await $util.getBalance(protocol.address, protocol), 0)
      assert.equal(await $util.getBalance(mediator.address, protocol), buyerFee + sellerFee)
    })

    it("transfers the tokens to the seller", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        amount: buyerAmount + sellerAmount
      })

      let sellerFee = 10

      await mediator.setSettleTransactionByMediatorFeeResponseForBuyer(0)
      await mediator.setSettleTransactionByMediatorFeeResponseForSeller(sellerFee)
      await mediator.settleTransaction(protocol.address, transaction.id, buyerAmount, sellerAmount)

      assert.equal(await $util.getBalance(protocol.address, protocol), 0)
      assert.equal(await $util.getBalance(seller, protocol), sellerAmount - sellerFee)
    })

    it("transfers the tokens to the buyer", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        amount: buyerAmount + sellerAmount
      })

      let buyerFee = 1

      await mediator.setSettleTransactionByMediatorFeeResponseForBuyer(buyerFee)
      await mediator.setSettleTransactionByMediatorFeeResponseForSeller(0)
      await mediator.settleTransaction(protocol.address, transaction.id, buyerAmount, sellerAmount)

      assert.equal(await $util.getBalance(protocol.address, protocol), 0)
      assert.equal(await $util.getBalance(buyer, protocol), buyerAmount - buyerFee)
    })

    it("emits the TransactionSettledByMediator event", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        amount: buyerAmount + sellerAmount
      })

      let buyerFee = 5
      let sellerFee = 10

      await mediator.setSettleTransactionByMediatorFeeResponseForBuyer(buyerFee)
      await mediator.setSettleTransactionByMediatorFeeResponseForSeller(sellerFee)
      await mediator.settleTransaction(protocol.address, transaction.id, buyerAmount, sellerAmount)

      let event = await $util.eventFromContract(protocol, $util.events.TransactionSettledByMediator)
      let eventArgs = event.args
      assert.equal(eventArgs.id, transaction.id)
      assert.equal(eventArgs.buyerAmount.toNumber(), buyerAmount)
      assert.equal(eventArgs.sellerAmount.toNumber(), sellerAmount)
      assert.equal(eventArgs.buyerMediatorFee.toNumber(), buyerFee)
      assert.equal(eventArgs.sellerMediatorFee.toNumber(), sellerFee)
    })
  })
})
