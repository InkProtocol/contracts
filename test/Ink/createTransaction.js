const $ink = require("./utils")
const InkMock = artifacts.require("./InkMock.sol")
const MediatorMock = artifacts.require("./MediatorMock.sol")
const PolicyMock = artifacts.require("./PolicyMock.sol")
const commaNumber = require("comma-number")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    mediator = await MediatorMock.new()
    policy = await PolicyMock.new()
    metadata = $ink.metadataToHash({title: "Title"})
  })

  buyer = accounts[1]
  seller = accounts[2]
  agent = accounts[3]
  amount = 100

  describe('#createTransaction()', () => {
    this.shouldCreateTheTransaction = (sender, withMedAndPol) => {
      it("creates a transaction", async () => {
        let xfer = await token.transfer(sender, amount)
        let eventArgs = $ink.eventFromTx(xfer, $ink.events.Transfer).args

        // verify transfer results
        assert.equal(eventArgs.to, sender)
        assert.equal(eventArgs.value, amount)

        let tx = (withMedAndPol) ? await token.createTransaction(seller, amount, metadata, policy.address, mediator.address, { from: sender }) : await token.createTransaction(seller, amount, metadata, 0, 0, { from: sender })
        eventArgs = $ink.eventFromTx(tx, $ink.events.TransactionInitiated).args

        assert.equal(eventArgs.id.toNumber(), 0)
        assert.equal(eventArgs.creator, sender)
        assert.equal(eventArgs.buyer, sender)
        assert.equal(eventArgs.seller, seller)
        if (withMedAndPol) {
          assert.equal(eventArgs.policy, policy.address)
          assert.equal(eventArgs.mediator, mediator.address)
        }
        else {
          assert.equal(eventArgs.policy, 0)
          assert.equal(eventArgs.mediator, 0)
        }
        assert.equal(eventArgs.amount.toNumber(), amount)
        assert.equal(eventArgs.metadata, metadata)

        let transaction = await $ink.getTransaction(eventArgs.id.toNumber(), token)

        assert.equal(transaction.creator, sender)
        assert.equal(transaction.buyer, sender)
        assert.equal(transaction.seller, seller)
        if (withMedAndPol) {
          assert.equal(transaction.policy, policy.address)
          assert.equal(transaction.mediator, mediator.address)
        }
        else {
          assert.equal(transaction.policy, 0)
          assert.equal(transaction.mediator, 0)
        }
        assert.equal(transaction.state, $ink.states.Initiated)
        assert.equal(transaction.amount, amount)
        assert.equal(transaction.metadata, metadata)

        assert.equal(await $ink.getBalance(token.address, token), amount)
      })
    }

    this.shouldFail = (sender, withMed, withPol) => {
      it("fails", async () => {
        await token.transfer(sender, amount)

        await $ink.assertVMExceptionAsync("revert", token.createTransaction(seller, amount, metadata, (withMed ? mediator.address : 0), (withPol ? policy.address : 0), { from: sender }))
      })
    }

    context("when create transaction by buyer", () => {
      context("with both mediator and policy", () => {
        this.shouldCreateTheTransaction(accounts[1], true)
      })

      context("without both mediator and policy", () => {
        this.shouldCreateTheTransaction(accounts[1], false)
      })

      context("with mediator and no policy", () => {
        this.shouldFail(buyer, true, false)
      })

      context("with no mediator and policy", () => {
        this.shouldFail(buyer, false, true)
      })
    })

    context("when create transaction by seller", () => {
      context("with both mediator and policy", () => {
        this.shouldFail(seller, true, true)
      })

      context("without both mediator and policy", () => {
        this.shouldFail(seller, false, false)
      })

      context("with mediator and no policy", () => {
        this.shouldFail(seller, true, false)
      })

      context("with no mediator and policy", () => {
        this.shouldFail(seller, false, true)
      })

    })
  })
}
