const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")
const PolicyMock = artifacts.require("./mocks/PolicyMock.sol")
const commaNumber = require("comma-number")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    buyer = accounts[1]
    seller = accounts[2]
    agent = accounts[3]
    amount = 100
  })

  describe("#disputeTransaction()", () => {
    this.shouldDisputeTheTransaction = (sender) => {
      // test dispute call in Accepted state
      it("disputes the transaction in Accepted state", async () => {
        let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        let fulfillmentExpiry = await policy.fulfillmentExpiry()
        $ink.advanceTime(fulfillmentExpiry.toNumber())
        await token.disputeTransaction(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.Disputed)
      })

      if (process.env.FULL == "1") {
        $ink.forEachStateExcept($ink.states.Accepted, (stateName, state) => {
          it(`fails when called from the ${stateName} state`, async () => {
            let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token })
            await token._updateTransactionState(transaction.id, state)
            let fulfillmentExpiry = await policy.fulfillmentExpiry()
            $ink.advanceTime(fulfillmentExpiry.toNumber())

            await $ink.assertVMExceptionAsync("revert", token.disputeTransaction(transaction.id, { from: sender }))
          })
        })
      }
    }

    this.shouldFail = (sender, advanceTime) => {
      it("fails", async () => {
        let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        let fulfillmentExpiry = await policy.fulfillmentExpiry()
        if (advanceTime) { $ink.advanceTime(fulfillmentExpiry.toNumber()) }

        await $ink.assertVMExceptionAsync("revert", token.disputeTransaction(transaction.id, { from: sender }))
      })
    }

    context("when dispute started by buyer", () => {
      context("before fulfillment expiry", () => {
        this.shouldFail(accounts[1], false)
      })

      context("after fulfillment expiry", () => {
        this.shouldDisputeTheTransaction(accounts[1])
      })
    })

    context ("when dispute started by seller", () => {
      context("before fulfillment expiry", () => {
        this.shouldFail(accounts[2], false)
      })

      context("after fulfillment expiry", () => {
        this.shouldFail(accounts[2], true)
      })
    })

    context("when dispute started by authorized agent", () => {
      beforeEach(async () => {
        await token.authorize(accounts[3], { from: accounts[1] })
      })

      context("before fulfillment expiry", () => {
        this.shouldFail(accounts[3], false)
      })

      context("after fulfillment expiry", () => {
        this.shouldDisputeTheTransaction(accounts[3])
      })
    })

    context("when dispute started by unauthorized agent", () => {
      context("before fulfillment expiry", () => {
        this.shouldFail(accounts[3], false)
      })

      context("after fulfillment expiry", () => {
        this.shouldFail(accounts[3], false)
      })
    })
  })
}
