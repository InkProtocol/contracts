const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")
const commaNumber = require("comma-number")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
  })

  buyer = accounts[1]
  seller = accounts[2]
  agent = accounts[3]
  amount = 100

  describe('#confirmTransaction()', () => {
    this.shouldConfirmTheTransaction = (sender) => {
      // test confirm transaction in Accepted state
      it("confirms the transaction in Accepted state", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        await token.confirmTransaction(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.Confirmed)

        let confirmTransactionFee = await mediator.confirmTransactionFee.call(transaction.amount)

        assert.equal(await $ink.getBalance(seller, token), amount - confirmTransactionFee)
      })

      // test confirm transaction in Disputed state
      it("confirms the transaction in Disputed state", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed })
        await token.confirmTransaction(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.ConfirmedAfterDispute)

        let confirmTransactionAfterDisputeFee = await mediator.confirmTransactionAfterDisputeFee.call(transaction.amount)

        assert.equal(await $ink.getBalance(seller, token), amount - confirmTransactionAfterDisputeFee)
      })

      // test confirm transaction in Escalated state
      it("confirms the transaction after escalation expiry in Escalated state", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated })
        let [ _, mediationExpiry ] = await mediator.requestMediator.call(transaction.id, transaction.amount)
        $ink.advanceTime(mediationExpiry.toNumber())
        await token.confirmTransaction(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.ConfirmedAfterEscalation)
        assert.equal(await $ink.getBalance(seller, token), amount)
      })
    }

    this.shouldFailBeforeExpiry = (sender) => {
      it("fails before escalation expiry in Escalated state", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated })
        let [ _, mediationExpiry ] = await mediator.requestMediator.call(transaction.id, transaction.amount)

        await $ink.assertVMExceptionAsync("revert", token.confirmTransaction(transaction.id, { from: sender }))
      })
    }

    this.shouldFail = (sender) => {
      it("fails in Accepted state", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })

        await $ink.assertVMExceptionAsync("revert", token.confirmTransaction(transaction.id, { from: sender }))
      })

      it("fails in Disputed state", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed })

        await $ink.assertVMExceptionAsync("revert", token.confirmTransaction(transaction.id, { from: sender }))
      })

      // test confirm transaction in Escalated state
      context("when in Escalated state", () => {
        it("fails after escalation expiry", async () => {
          let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated })
          let [ _, mediationExpiry ] = await mediator.requestMediator.call(transaction.id, transaction.amount)
          $ink.advanceTime(mediationExpiry.toNumber())

          await $ink.assertVMExceptionAsync("revert", token.confirmTransaction(transaction.id, { from: sender }))
        })

        context("before escalation expiry", () => {
          this.shouldFailBeforeExpiry(buyer)
        })
      })

      context("when in init state", () => {
        it("should fail", async () => {
          let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Initiated })

          await $ink.assertVMExceptionAsync("revert", token.confirmTransaction(transaction.id, { from: buyer }))
        })
      })
    }

    context("when confirm transaction by buyer", () => {
      context("before escalation expiry", () => {
        this.shouldFailBeforeExpiry(buyer)
      })

      context("when in init state", () => {
        it("should fail", async () => {
          let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Initiated })

          await $ink.assertVMExceptionAsync("revert", token.confirmTransaction(transaction.id, { from: buyer }))
        })
      })

      context("after escalation expiry", () => {
        this.shouldConfirmTheTransaction(buyer)
      })
    })

    context("when confirm transaction by seller", () => {
      this.shouldFail(seller)
    })

    context("when confirm transaction by authorized agent", () => {
      beforeEach(async () => {
        await token.authorize(agent, { from: buyer })
      })

      context("before escalation expiry", () => {
        this.shouldFailBeforeExpiry(agent)
      })

      context("when in init state", () => {
        it("should fail", async () => {
          let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Initiated })

          await $ink.assertVMExceptionAsync("revert", token.confirmTransaction(transaction.id, { from: buyer }))
        })
      })

      context("after escalation expiry", () => {
        this.shouldConfirmTheTransaction(agent)
      })
    })

    context("when confirm transaction by unauthorized agent", () => {
      context("before escalation expiry", () => {
        this.shouldFail(agent)
      })

      context("after escalation expiry", () => {
        this.shouldFail(agent)
      })
    })
  })
}
