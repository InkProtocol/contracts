const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")
const commaNumber = require("comma-number")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    buyer = accounts[1]
    seller = accounts[2]
    amount = 100
  })

  describe("#revokeTransaction()", () => {
    this.shouldRevokeTheTransaction = (sender) => {
      it("revokes the transaction", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token })
        await token.revokeTransaction(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.Revoked)
      })

      it("sends tokens back to the buyer", async () => {
        let originalContractBalance = await $ink.getBalance(token.address, token)
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, amount: amount })
        await token.revokeTransaction(transaction.id, { from: sender })

        assert.equal(await $ink.getBalance(buyer, token), amount)
        assert.equal(await $ink.getBalance(token.address, token), originalContractBalance)
      })

      if (process.env.FULL == "1") {
        $ink.forEachStateExcept($ink.states.Initiated, (stateName, state) => {
          it(`fails when called from the ${stateName} state`, async () => {
            let { transaction } = await $ink.createTransaction(buyer, seller, { token: token })
            await token._updateTransactionState(transaction.id, state)

            await $ink.assertVMExceptionAsync("revert", token.revokeTransaction(transaction.id, { from: sender }))
          })
        })
      }
    }

    this.shouldFail = (sender) => {
      it("fails", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token })

        await $ink.assertVMExceptionAsync("revert", token.revokeTransaction(transaction.id, { from: sender }))
      })
    }

    context("when called by buyer", () => {
      this.shouldRevokeTheTransaction(accounts[1])
    })

    context("when called by seller", () => {
      this.shouldFail(accounts[2])
    })

    context("when called by authorized agent", () => {
      beforeEach(async () => {
        await token.authorize(accounts[3], { from: accounts[1] })
      })

      this.shouldRevokeTheTransaction(accounts[3])
    })

    context("when called by unauthorized agent", () => {
      this.shouldFail(accounts[3])
    })
  })
}
