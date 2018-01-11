const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")
const commaNumber = require("comma-number")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    buyer = accounts[1]
    seller = accounts[2]
    agent = accounts[3]
  })

  describe("#settleTransaction()", () => {
    this.shouldSettleTheTransaction = (sender, amount) => {
      // test settling the transaction call in Escalated state
      it("settles the transaction in Escalated state", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, amount: amount, state: $ink.states.Escalated })
        let [ _, mediationExpiry ] = await mediator.requestMediator.call(transaction.id, transaction.amount)
        $ink.advanceTime(mediationExpiry.toNumber())
        await token.settleTransaction(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.Settled)

        // floor buyer amount, if odd, lesser amount will go to buyer
        let buyerAmount = Math.floor(amount / 2)
        let sellerAmount = amount - buyerAmount

        assert.equal(await $ink.getBalance(seller, token), sellerAmount)
        assert.equal(await $ink.getBalance(buyer, token), buyerAmount)
      })
    }

    this.shouldFail = (sender, advanceTime) => {
      it("this should fail", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated })
        let [ _, mediationExpiry ] = await mediator.requestMediator.call(transaction.id, transaction.amount)
        if (advanceTime) { $ink.advanceTime(mediationExpiry.toNumber()) }

        await $ink.assertVMExceptionAsync("revert", token.settleTransaction(transaction.id, { from: sender }))
      })
    }

    context("when settling the transaction by buyer", () => {
      context("before escalation expiry", () => {
        this.shouldFail(accounts[1], false)
      })

      context("after escalation expiry", () => {
        context("transaction amount: 100", () => {
          this.shouldSettleTheTransaction(accounts[1], 100)
        })

        context("transaction amount: 99", () => {
          this.shouldSettleTheTransaction(accounts[1], 99)
        })
      })
    })

    context ("when settling the transaction by seller", () => {
      context("before escalation expiry", () => {
        this.shouldFail(accounts[2], false)
      })

      context("after escalation expiry", () => {
        context("transaction amount: 100", () => {
          this.shouldSettleTheTransaction(accounts[2], 100)
        })

        context("transaction amount: 99", () => {
          this.shouldSettleTheTransaction(accounts[2], 99)
        })
      })
    })

    context("when settling the transaction by authorized agent by buyer", () => {
      beforeEach(async () => {
        await token.authorize(accounts[3], { from: accounts[1] })
      })

      context("before escalation expiry", () => {
        this.shouldFail(accounts[3], false)
      })

      context("after escalation expiry", () => {
        this.shouldSettleTheTransaction(accounts[3], 100)
      })
    })

    context("when settling the transaction by authorized agent by seller", () => {
      beforeEach(async () => {
        await token.authorize(accounts[3], { from: accounts[2] })
      })

      context("before escalation expiry", () => {
        this.shouldFail(accounts[3], false)
      })

      context("after escalation expiry", () => {
        this.shouldSettleTheTransaction(accounts[3], 100)
      })
    })

    context("when settling the transaction by unauthorized agent", () => {
      context("before escalation expiry", () => {
        this.shouldFail(accounts[3], false)
      })

      context("after escalation expiry", () => {
        this.shouldFail(accounts[3], false)
      })
    })

    context("when not in escalated state", () => {
      sender = accounts[2]

      it("should fail", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Completed })

        await $ink.assertVMExceptionAsync("revert", token.settleTransaction(transaction.id, { from: sender }))
      })
    })
  })
}
