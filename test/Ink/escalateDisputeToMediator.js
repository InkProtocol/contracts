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

  describe("#escalateDisputeToMediator()", () => {
    this.shouldEscalateDisputetoMediator = (sender) => {
      // test escalate to mediator call in Disputed state
      it("escalates the transaction to mediator in Disputed state", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed })
        await token.escalateDisputeToMediator(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)

        assert.equal(transaction.state, $ink.states.Escalated)
      })
    }

    this.shouldFail = (sender) => {
      it("this should fail", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed })

        await $ink.assertVMExceptionAsync("revert", token.escalateDisputeToMediator(transaction.id, { from: sender }))
      })
    }

    context("when called by buyer", () => {
      this.shouldFail(accounts[1])
    })

    context("when called by seller", () => {
      this.shouldEscalateDisputetoMediator(accounts[2])
    })

    context("when called by authorized agent", () => {
      beforeEach(async () => {
        await token.authorize(accounts[3], { from: accounts[2] })
      })
      this.shouldEscalateDisputetoMediator(accounts[3])
    })

    context("when called by unauthorized agent", () => {
      this.shouldFail(accounts[3])
    })

  })
}
