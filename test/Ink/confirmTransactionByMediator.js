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

  describe('#confirmTransactionByMediator()', () => {
    this.shouldFail = (sender) => {
      it("fails when not confirmed by mediator", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated, amount: amount })

        await $ink.assertVMExceptionAsync("revert", mediator.confirmTransaction(transaction.id, { from: sender }))
      })
    }

    context("when confirm transaction by buyer", () => {
      this.shouldFail(buyer)
    })

    context("when confirm transaction by seller", () => {
      this.shouldFail(seller)
    })

    context("when confirm transaction by unauthorized agent", () => {
      this.shouldFail(agent)
    })

    context("when confirm transaction by mediator", () => {
      it("fails in Disputed state", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed, amount: amount })

        await $ink.assertVMExceptionAsync("revert", mediator.confirmTransaction(transaction.id, token.address))
      })

      it("confirms the transaction in Escalated state", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated, amount: amount })
        let mediatorFee = await mediator.confirmTransactionByMediatorFee.call(amount)
        await mediator.confirmTransaction(transaction.id, token.address)

        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.ConfirmedByMediator)
        assert.equal(await $ink.getBalance(seller, token), amount - mediatorFee)
        assert.equal(await $ink.getBalance(mediator.address, token), mediatorFee)
      })

      it("confirms the transaction after mediation period expiry", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated, amount: amount })
        let [ _, mediationExpiry ] = await mediator.requestMediator.call(transaction.id, transaction.amount)
        $ink.advanceTime(mediationExpiry.toNumber())
        let mediatorFee = await mediator.confirmTransactionByMediatorFee.call(amount)
        await mediator.confirmTransaction(transaction.id, token.address)

        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.ConfirmedByMediator)
        assert.equal(await $ink.getBalance(seller, token), amount - mediatorFee)
        assert.equal(await $ink.getBalance(mediator.address, token), mediatorFee)
      })

      if (process.env.FULL == "1") {
        $ink.forEachStateExcept($ink.states.Escalated, (stateName, state) => {
          it(`fails when called from the ${stateName} state`, async () => {
            let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, amount: amount })
            await token._updateTransactionState(transaction.id, state)

            await $ink.assertVMExceptionAsync("revert", mediator.confirmTransaction(transaction.id, { from: sender }))
          })
        })
      }
    })
  })
}
