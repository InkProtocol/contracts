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

  describe('#confirmTransactionAfterExpiry()', () => {
    this.shouldConfirmTheTransactionAfterExpiry = (sender) => {
      // test confirm transaction in Accepted state after expiry
      it("confirms the transaction in Accepted state after expiry", async () => {
        let { transaction, policy, mediator} = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        let transactionExpiry = await policy.transactionExpiry()
        $ink.advanceTime(transactionExpiry.toNumber())
        await token.confirmTransactionAfterExpiry(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.ConfirmedAfterExpiry)

        let confirmTransactionAfterExpiryFee = await mediator.confirmTransactionAfterExpiryFee.call(transaction.amount)

        assert.equal(await $ink.getBalance(seller, token), amount - confirmTransactionAfterExpiryFee)
      })

      if (process.env.FULL == "1") {
        $ink.forEachStateExcept($ink.states.Accepted, (stateName, state) => {
          it(`fails when called from the ${stateName} state`, async () => {
            let { transaction } = await $ink.createTransaction(buyer, seller, { token: token })
            await token._updateTransactionState(transaction.id, state)

            await $ink.assertVMExceptionAsync("revert", token.confirmTransactionAfterExpiry(transaction.id, { from: sender }))
          })
        })
      }
    }

    this.shouldFail = (sender) => {
      context("before transaction expiry", () => {
        it("fails", async () => {
          let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
          let transactionExpiry = await policy.transactionExpiry()

          await $ink.assertVMExceptionAsync("revert", token.confirmTransactionAfterExpiry(transaction.id, { from: sender }))
        })
      })

      context("after transaction expiry", () => {
        it("fails", async () => {
          let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
          let transactionExpiry = await policy.transactionExpiry()
          $ink.advanceTime(transactionExpiry.toNumber())

          await $ink.assertVMExceptionAsync("revert", token.confirmTransactionAfterExpiry(transaction.id, { from: sender }))
        })
      })
    }

    context("when confirm transaction by buyer", () => {
      this.shouldFail(buyer)
    })

    context("when confirm transaction by seller", () => {
      it("fails before transaction expiry", async () => {
        let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        let transactionExpiry = await policy.transactionExpiry()

        await $ink.assertVMExceptionAsync("revert", token.confirmTransactionAfterExpiry(transaction.id, { from: seller }))
      })

      context("after transaction expiry", () => {
        this.shouldConfirmTheTransactionAfterExpiry(seller)
      })
    })

    context("when confirm transaction by authorized agent", () => {
      beforeEach(async () => {
        await token.authorize(agent, { from: seller })
      })

      it("fails before transaction expiry", async () => {
        let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        let transactionExpiry = await policy.transactionExpiry()

        await $ink.assertVMExceptionAsync("revert", token.confirmTransactionAfterExpiry(transaction.id, { from: agent }))
      })

      context("after transaction expiry", () => {
        this.shouldConfirmTheTransactionAfterExpiry(agent)
      })
    })

    context("when confirm transaction by unauthorized agent", () => {
      this.shouldFail(agent)
    })
  })
}
