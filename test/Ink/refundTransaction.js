const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")
const commaNumber = require("comma-number")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    buyer = accounts[1]
    seller = accounts[2]
    agent = accounts[3]
    amount = 100
  })

  describe("#refundTransaction()", () => {
    this.shouldRefundTheTransaction = (sender) => {
      // test refund transaction in Accepted state
      it("refunds the transaction in Accepted state", async () => {
        let originalContractBalance = await $ink.getBalance(token.address, token)
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        await token.refundTransaction(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.Refunded)
        assert.equal(await $ink.getBalance(token.address, token), originalContractBalance)

        let refundTransactionFee = await mediator.refundTransactionFee.call(transaction.amount)

        assert.equal(await $ink.getBalance(buyer, token), amount - refundTransactionFee)
      })

      // test refund transaction in Disputed state
      it("refunds the transaction in Disputed state", async () => {
        let originalContractBalance = await $ink.getBalance(token.address, token)
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed })
        await token.refundTransaction(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.RefundedAfterDispute)
        assert.equal(await $ink.getBalance(token.address, token), originalContractBalance)

        let refundTransactionAfterDisputeFee = await mediator.refundTransactionAfterDisputeFee.call(transaction.amount)

        assert.equal(await $ink.getBalance(buyer, token), amount - refundTransactionAfterDisputeFee)
      })

      // test refund transaction in Escalated state
      it("refunds the transaction in Escalated state", async () => {
        let originalContractBalance = await $ink.getBalance(token.address, token)
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated })
        let [ _, mediationExpiry ] = await mediator.requestMediator.call(transaction.id, transaction.amount)
        $ink.advanceTime(mediationExpiry.toNumber())
        await token.refundTransaction(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.RefundedAfterEscalation)
        assert.equal(await $ink.getBalance(buyer, token), amount)
        assert.equal(await $ink.getBalance(token.address, token), originalContractBalance)
      })
    }

    this.shouldFail = (sender) => {
      it("fails in Accepted state", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })

        await $ink.assertVMExceptionAsync("revert", token.refundTransaction(transaction.id, { from: sender }))
      })

      it("fails in Disputed state", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed })

        await $ink.assertVMExceptionAsync("revert", token.refundTransaction(transaction.id, { from: sender }))
      })
    }

    this.shouldFailBeforeExpiry = (sender, advanceTime) => {
      it("fails in Escalated state", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated })
        let [ _, mediationExpiry ] = await mediator.requestMediator.call(transaction.id, transaction.amount)
        if (advanceTime) { $ink.advanceTime(mediationExpiry.toNumber()) }

        await $ink.assertVMExceptionAsync("revert", token.refundTransaction(transaction.id, { from: sender }))
      })
    }

    context("when confirm transaction by buyer", () => {
      context("before escalation expiry", () => {
        this.shouldFail(accounts[1])
        this.shouldFailBeforeExpiry(accounts[1], false)
      })

      context("after escalation expiry", () => {
        this.shouldFail(accounts[1])
        this.shouldFailBeforeExpiry(accounts[1], true)
      })
    })

    context("when confirm transaction by seller", () => {
      context("before escalation expiry", () => {
        this.shouldFailBeforeExpiry(accounts[2], false)
      })

      context("after escalation expiry", () => {
        this.shouldRefundTheTransaction(accounts[2])
      })
    })

    context("when confirm transaction by authorized agent", () => {
      beforeEach(async () => {
        await token.authorize(accounts[3], { from: accounts[2] })
      })

      context("before escalation expiry", () => {
        this.shouldFailBeforeExpiry(accounts[3], false)
      })

      context("after escalation expiry", () => {
        this.shouldRefundTheTransaction(accounts[3])
      })
    })

    context("when confirm transaction by unauthorized agent", () => {
      context("before escalation expiry", () => {
        this.shouldFail(accounts[3])
        this.shouldFailBeforeExpiry(accounts[3], false)
      })

      context("after escalation expiry", () => {
        this.shouldFail(accounts[3])
        this.shouldFailBeforeExpiry(accounts[3], true)
      })
    })
  })
}
