const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")

contract("InkProtocol", (accounts) => {
  let buyer,
      seller,
      unknown

  beforeEach(async () => {
    buyer = accounts[1]
    seller = accounts[2]
    unknown = accounts[accounts.length - 1]
  })

  describe("#acceptTransaction()", () => {
    it("fails for buyer", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Initiated
      })

      await $util.assertVMExceptionAsync(protocol.acceptTransaction(transaction.id, { from: buyer }))
    })

    it("fails for owner", async () => {
      let {
        protocol,
        transaction,
        owner
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Initiated,
        owner: true
      })

      await $util.assertVMExceptionAsync(owner.proxyAcceptTransaction(protocol.address, transaction.id))
    })

    it("fails for mediator", async () => {
      let {
        protocol,
        mediator,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Initiated
      })

      await $util.assertVMExceptionAsync(mediator.proxyAcceptTransaction(protocol.address, transaction.id))
    })

    it("fails for policy", async () => {
      let {
        protocol,
        policy,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Initiated
      })

      await $util.assertVMExceptionAsync(policy.proxyAcceptTransaction(protocol.address, transaction.id))
    })

    it("fails for unknown address", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Initiated
      })

      await $util.assertVMExceptionAsync(protocol.acceptTransaction(transaction.id, {
        from: unknown
      }))
    })

    it("fails when transaction does not exist", async () => {
      protocol = await InkProtocol.new()
      await $util.assertVMExceptionAsync(protocol.acceptTransaction(0))
    })

    describe("when a mediator is specified", () => {
      it("emits the TransactionAccepted event", async () => {
        let {
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Initiated
        })

        let tx = await protocol.acceptTransaction(transaction.id, { from: seller })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionAccepted).args

        assert.equal(eventArgs.id.toNumber(), transaction.id)
      })
    })

    describe("when a mediator is not specified", () => {
      it("emits the TransactionAccepted event", async () => {
        let {
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Initiated,
          mediator: false
        })

        let tx = await protocol.acceptTransaction(transaction.id, { from: seller })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionAccepted).args

        assert.equal(eventArgs.id.toNumber(), transaction.id)
      })

      it("emits the TransactionConfirmed event", async () => {
        let {
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Initiated,
          mediator: false
        })

        let tx = await protocol.acceptTransaction(transaction.id, { from: seller })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmed).args

        assert.equal(eventArgs.id.toNumber(), transaction.id)
      })

      it("transfers tokens from escrow to the seller", async () => {
        let {
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Initiated,
          mediator: false
        })

        await protocol.acceptTransaction(transaction.id, { from: seller })

        assert.equal((await protocol.balanceOf.call(protocol.address)).toNumber(), 0)
        assert.equal((await protocol.balanceOf.call(seller)).toNumber(), transaction.amount.toNumber())
      })
    })
  })
})
