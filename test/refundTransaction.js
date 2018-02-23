const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")

contract("InkProtocol", (accounts) => {
  let buyer,
      seller,
      unknown

  beforeEach(() => {
    buyer = accounts[1]
    seller = accounts[2]
    unknown = accounts[accounts.length - 1]
  })

  describe("#refundTransaction()", () => {
    it("fails for buyer", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      await $util.assertVMExceptionAsync(protocol.refundTransaction(transaction.id, { from: buyer }))
    })

    it("fails for owner", async () => {
      let {
        owner,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted,
        owner: true
      })

      await $util.assertVMExceptionAsync(owner.proxyRefundTransaction(protocol.address, transaction.id))
    })

    it("fails for mediator", async () => {
      let {
        mediator,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      await $util.assertVMExceptionAsync(mediator.proxyRefundTransaction(protocol.address, transaction.id))
    })

    it("fails for policy", async () => {
      let {
        policy,
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      await $util.assertVMExceptionAsync(policy.proxyRefundTransaction(protocol.address, transaction.id))
    })

    it("fails for unknown address", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      await $util.assertVMExceptionAsync(protocol.refundTransaction(transaction.id, { from: unknown }))
    })

    it("fails when transaction does not exist", async () => {
      let protocol = await InkProtocol.new()

      await $util.assertVMExceptionAsync(protocol.refundTransaction(0, { from: seller }))
    })

    describe("when state is Accepted", () => {
      it("passes the transaction's amount to the mediator", async () => {
        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await protocol.refundTransaction(transaction.id, { from: seller })

        let event = await $util.eventFromContract(mediator, "RefundTransactionFeeCalled")
        assert.equal(event.args.transactionAmount.toNumber(), transaction.amount)
      })

      it("transfers the mediator fee to the mediator", async () => {
        let mediatorFee = 10

        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await mediator.setRefundTransactionFeeResponse(mediatorFee)
        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(mediator.address, protocol), mediatorFee)
      })

      it("emits the TransactionRefunded event", async () => {
        let {
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        let tx = await protocol.refundTransaction(transaction.id, { from: seller })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionRefunded).args

        assert.equal(eventArgs.id, transaction.id)
      })

      it("transfers the tokens to the buyer", async () => {
        let mediatorFee = 10

        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await mediator.setRefundTransactionFeeResponse(mediatorFee)
        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(buyer, protocol), transaction.amount - mediatorFee)
      })

      it("collects 0 fee when mediator raises an error", async () => {
        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await mediator.setRaiseError(true)
        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
      })

      it("collects 0 fee when mediator returns a fee higher than the transaction amount", async () =>{
        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await mediator.setRefundTransactionFeeResponse(transaction.amount + 1)
        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
      })
    })

    describe("when state is Disputed", () => {
      it("passes the transaction's amount to the mediator", async () => {
        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await protocol.refundTransaction(transaction.id, { from: seller })

        let event = await $util.eventFromContract(mediator, "RefundTransactionAfterDisputeFeeCalled")
        assert.equal(event.args.transactionAmount.toNumber(), transaction.amount)
      })

      it("transfers the mediator fee to the mediator", async () => {
        let mediatorFee = 10

        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await mediator.setRefundTransactionAfterDisputeFeeResponse(mediatorFee)
        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(mediator.address, protocol), mediatorFee)
      })

      it("emits the TransactionRefundedAfterDispute event", async () => {
        let {
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        let tx = await protocol.refundTransaction(transaction.id, { from: seller })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionRefundedAfterDispute).args
        assert.equal(eventArgs.id, transaction.id)
      })

      it("transfers the tokens to the buyer", async () => {
        let mediatorFee = 10

        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await mediator.setRefundTransactionAfterDisputeFeeResponse(mediatorFee)
        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(buyer, protocol), transaction.amount - mediatorFee)
      })

      it("collects 0 fee when mediator raises an error", async () => {
        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await mediator.setRaiseError(true)
        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
      })

      it("collects 0 fee when mediator returns a fee higher than the transaction amount", async () => {
        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await mediator.setRefundTransactionAfterDisputeFeeResponse(transaction.amount + 1)
        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
      })
    })

    describe("when state is Escalated", () => {
      it("fails before mediation expiry", async () => {
        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        // 10 seconds in the future.
        await mediator.setMediationExpiryResponse(10)

        await $util.assertVMExceptionAsync(protocol.refundTransaction(transaction.id, { from: seller }))
      })

      it("calls the mediator for the mediation expiry", async () => {
        let mediationExpiry = 10 * 60 // 10 minutes

        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)

        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.isNotNull(await $util.eventFromContract(mediator, "MediationExpiryCalled"))
      })

      it("sets mediation expiry to 0 when mediator raises an error", async () => {
        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setMediationExpiryResponse(600)
        await mediator.setRaiseError(true)
        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(buyer, protocol), transaction.amount)
      })

      it("emits the TransactionRefundedAfterEscalation event", async () => {
        let mediationExpiry = 10 * 60 // 10 minutes

        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)

        let tx = await protocol.refundTransaction(transaction.id, { from: seller })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionRefundedAfterEscalation).args
        assert.equal(eventArgs.id, transaction.id)
      })

      it("transfers the tokens to the buyer", async () => {
        let mediationExpiry = 10 * 60 // 10 minutes

        let {
          mediator,
          protocol,
          transaction
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)

        await protocol.refundTransaction(transaction.id, { from: seller })

        assert.equal(await $util.getBalance(buyer, protocol), transaction.amount.toNumber())
      })
    })
  })
})
