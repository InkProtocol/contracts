const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")
const MediatorMock = artifacts.require("./mocks/MediatorMock.sol")
const commaNumber = require("comma-number")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    mediator = await MediatorMock.new()
  })

  buyer = accounts[1]
  seller = accounts[2]
  agent = accounts[3]
  amount = 101

  describe("#refundTransactionByMediator()", () => {
    this.shouldFail = (sender) => {
      it("fails when not refunded by mediator", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { mediator: mediator, token: token, state: $ink.states.Escalated, amount: amount })

        await $ink.assertVMExceptionAsync("revert", token.refundTransaction(transaction.id, { from: sender }))
      })
    }

    context("when refund transaction by buyer", () => {
      this.shouldFail(buyer)
    })

    context("when refund transaction by seller", () => {
      this.shouldFail(seller)
    })

    context("when refund transaction by unauthorized agent", () => {
      this.shouldFail(agent)
    })

    context("when mediator refunding the transaction", () => {
      context("when transaction is not Escalated state", () => {
        it("fails in non Escalated state", async () => {
          let { transaction } = await $ink.createTransaction(buyer, seller, { mediator: mediator, token: token, state: $ink.states.Disputed })

          await $ink.assertVMExceptionAsync("revert", mediator.refundTransaction(transaction.id, token.address))
        })
      })

      context("when transaction is in Escalated state", () => {
        it("refunds the transaction to RefundedByMediator state", async () => {
          let { transaction } = await $ink.createTransaction(buyer, seller, { mediator: mediator, amount: amount, token: token, state: $ink.states.Escalated })
          let transactionMediatorFee = await mediator.refundTransactionByMediatorFee.call(transaction.amount)
          await mediator.refundTransaction(transaction.id, token.address)

          transaction = await $ink.getTransaction(transaction.id, token)
          let refundedBuyerAmount = amount - transactionMediatorFee

          assert.equal(transaction.state, $ink.states.RefundedByMediator)
          assert.equal(await $ink.getBalance(buyer, token), refundedBuyerAmount)
          assert.equal(await $ink.getBalance(seller, token), 0)
          assert.equal(await $ink.getBalance(mediator.address, token), transactionMediatorFee)
        })

        it("refunds the transaction after mediation period expiry", async () => {
          let { transaction } = await $ink.createTransaction(buyer, seller, { mediator: mediator, amount: amount, token: token, state: $ink.states.Escalated })

          // after mediation period expiry
          let [ _, mediationExpiry ] = await mediator.requestMediator.call(transaction.id, transaction.amount)
          $ink.advanceTime(mediationExpiry.toNumber())

          let transactionMediatorFee = await mediator.refundTransactionByMediatorFee.call(transaction.amount)
          await mediator.refundTransaction(transaction.id, token.address)

          transaction = await $ink.getTransaction(transaction.id, token)
          let refundedBuyerAmount = amount - transactionMediatorFee

          assert.equal(transaction.state, $ink.states.RefundedByMediator)
          assert.equal(await $ink.getBalance(buyer, token), refundedBuyerAmount)
          assert.equal(await $ink.getBalance(seller, token), 0)
          assert.equal(await $ink.getBalance(mediator.address, token), transactionMediatorFee)
        })
      })
    })
  })
}
