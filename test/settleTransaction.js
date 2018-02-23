const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")

contract("InkProtocol", (accounts) => {
  let buyer,
      seller,
      unknown,
      mediationExpiry

  beforeEach(() => {
    buyer = accounts[1]
    seller = accounts[2]
    unknown = accounts[accounts.length - 1]
    mediationExpiry = 86400
  })

  describe("#settleTransaction()", () => {
    it("fails for owner", async () => {
      let {
        mediator,
        protocol,
        transaction,
        owner
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated,
        owner: true
      })

      await mediator.setMediationExpiryResponse(mediationExpiry)
      $util.advanceTime(mediationExpiry)

      await $util.assertVMExceptionAsync(owner.proxySettleTransaction(protocol.address, transaction.id))
    })

    it("fails for mediator", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await mediator.setMediationExpiryResponse(mediationExpiry)
      $util.advanceTime(mediationExpiry)

      await $util.assertVMExceptionAsync(mediator.proxySettleTransaction(protocol.address, transaction.id))
    })

    it("fails for policy", async () => {
      let {
        mediator,
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await mediator.setMediationExpiryResponse(mediationExpiry)
      $util.advanceTime(mediationExpiry)

      await $util.assertVMExceptionAsync(policy.proxySettleTransaction(protocol.address, transaction.id))
    })

    it("fails for unknown address", async () => {
      let {
        mediator,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await mediator.setMediationExpiryResponse(mediationExpiry)
      $util.advanceTime(mediationExpiry)

      await $util.assertVMExceptionAsync(protocol.settleTransaction(transaction.id, { from: unknown }))
    })

    describe("when called by buyer", () => {
      it("fails before mediation expiry", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry - 10)

        await $util.assertVMExceptionAsync(protocol.settleTransaction(transaction.id, { from: buyer }))
      })

      it("calls the mediator for the mediation expiry", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })
        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)
        await protocol.settleTransaction(transaction.id, { from: buyer })

        assert.isNotNull(await $util.eventFromContract(mediator, "MediationExpiryCalled"))
      })

      it("sets mediation expiry to 0 when mediator raises an error", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setRaiseError(true)

        let tx = await protocol.settleTransaction(transaction.id, { from: buyer })
        assert.isNotNull($util.eventFromTx(tx, $util.events.TransactionSettled))
      })

      it("splits the transaction amount for buyer and seller", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated,
          amount: 100
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)
        await protocol.settleTransaction(transaction.id, { from: buyer })

        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(buyer, protocol), 50)
        assert.equal(await $util.getBalance(seller, protocol), 50)
      })

      it("gives the seller more when amount is not divisible by 2", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated,
          amount: 99
        })
        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)
        await protocol.settleTransaction(transaction.id, { from: buyer })

        assert.equal(await $util.getBalance(buyer, protocol), 49)
        assert.equal(await $util.getBalance(seller, protocol), 50)
      })

      it("emits the TransactionSettled event", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated,
          amount: 50
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)

        let tx = await protocol.settleTransaction(transaction.id, { from: buyer })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionSettled).args
        assert.equal(eventArgs.id, transaction.id)
        assert.equal(eventArgs.buyerAmount, 25)
        assert.equal(eventArgs.sellerAmount, 25)
      })
    })

    describe("when called by seller", () => {
      it("fails before mediation expiry", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry - 10)

        await $util.assertVMExceptionAsync(protocol.settleTransaction(transaction.id, { from: seller }))
      })

      it("calls the mediator for the mediation expiry", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)

        await protocol.settleTransaction(transaction.id, { from: seller })
        assert.isNotNull(await $util.eventFromContract(mediator, "MediationExpiryCalled"))
      })

      it("sets mediation expiry to 0 when mediator raises an error", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setRaiseError(true)

        let tx = await protocol.settleTransaction(transaction.id, { from: seller })
        assert.isNotNull(await $util.eventFromTx(tx, $util.events.TransactionSettled))
      })

      it("splits the transaction amount for buyer and seller", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated,
          amount: 60
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)
        await protocol.settleTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(buyer, protocol), 30)
        assert.equal(await $util.getBalance(seller, protocol), 30)
      })

      it("gives the seller more when amount is not divisible by 2", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated,
          amount: 99
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)
        await protocol.settleTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(buyer, protocol), 49)
        assert.equal(await $util.getBalance(seller, protocol), 50)
      })

      it("emits the TransactionSettled event", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated,
          amount: 40
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)

        let tx = await protocol.settleTransaction(transaction.id, { from: seller })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionSettled).args
        assert.equal(eventArgs.id, transaction.id)
        assert.equal(eventArgs.buyerAmount, 20)
        assert.equal(eventArgs.sellerAmount, 20)
      })
    })
  })
})
