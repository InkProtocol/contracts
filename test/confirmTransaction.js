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

  describe("#confirmTransaction()", () => {
    it("fails for seller", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      await $util.assertVMExceptionAsync(protocol.confirmTransaction(transaction.id, { from: seller }))
    })

    it("fails for owner", async () => {
      let {
        protocol,
        transaction,
        owner
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted,
        owner: true
      })

      await $util.assertVMExceptionAsync(owner.proxyConfirmTransaction(protocol.address, transaction.id))
    })

    it("fails for mediator", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      await $util.assertVMExceptionAsync(mediator.proxyConfirmTransaction(protocol.address, transaction.id))
    })

    it("fails for policy", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      await $util.assertVMExceptionAsync(policy.proxyConfirmTransaction(protocol.address, transaction.id))
    })

    it("fails for unknown address", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      await $util.assertVMExceptionAsync(protocol.confirmTransaction(transaction.id, { from: unknown }))
    })

    it("fails when transaction does not exist", async () => {
      protocol = await InkProtocol.new()

      await $util.assertVMExceptionAsync(protocol.confirmTransaction(0, { from: buyer }))
    })

    describe("when state is Accepted", () => {
      it("passes the transaction's amount to the mediator", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await protocol.confirmTransaction(transaction.id, { from: buyer })

        let event = await $util.eventFromContract(mediator, "ConfirmTransactionFeeCalled")
        assert.equal(event.args.transactionAmount.toNumber(), transaction.amount)
      })

      it("transfers the mediator fee to the mediator", async () => {
        let mediatorFee = 10

        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await mediator.setConfirmTransactionFeeResponse(mediatorFee)
        await protocol.confirmTransaction(transaction.id, { from: buyer })

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(mediator.address, protocol), mediatorFee)
      })

      it("emits the TransactionConfirmed event", async () => {
        let mediatorFee = 10

        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await mediator.setConfirmTransactionFeeResponse(mediatorFee)

        let tx = await protocol.confirmTransaction(transaction.id, { from: buyer })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmed).args
        assert.equal(eventArgs.id.toNumber(), transaction.id)
        assert.equal(eventArgs.mediatorFee.toNumber(), mediatorFee)
      })

      it("transfers the tokens to the seller", async () => {
        let mediatorFee = 10

        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await mediator.setConfirmTransactionFeeResponse(mediatorFee)
        await protocol.confirmTransaction(transaction.id, { from: buyer })

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(buyer, protocol), 0)
        assert.equal(await $util.getBalance(seller, protocol), transaction.amount - mediatorFee)
      })

      it("collects 0 fee when mediator raises an error", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await mediator.setRaiseError(true)

        let tx = await protocol.confirmTransaction(transaction.id, { from: buyer })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmed).args

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
        assert.equal(await $util.getBalance(seller, protocol), transaction.amount)
        assert.equal(eventArgs.mediatorFee, 0)
      })

      it("collects 0 fee when mediator returns a fee higher than the transaction amount", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Accepted
        })

        await mediator.setConfirmTransactionFeeResponse(transaction.amount + 1)

        let tx = await protocol.confirmTransaction(transaction.id, { from: buyer })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmed).args

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
        assert.equal(await $util.getBalance(seller, protocol), transaction.amount)

        assert.equal(eventArgs.mediatorFee, 0)
      })
    })

    describe("when state is Disputed", () => {
      it("passes the transaction's amount to the mediator", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await protocol.confirmTransaction(transaction.id, { from: buyer })

        let event = await $util.eventFromContract(mediator, "ConfirmTransactionAfterDisputeFeeCalled")
        assert.equal(event.args.transactionAmount.toNumber(), transaction.amount)
      })

      it("transfers the mediator fee to the mediator", async () => {
        let mediatorFee = 10

        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await mediator.setConfirmTransactionAfterDisputeFeeResponse(mediatorFee)
        await protocol.confirmTransaction(transaction.id, { from: buyer })

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(mediator.address, protocol), mediatorFee)
      })

      it("emits the TransactionConfirmedAfterDispute event", async () => {
        let mediatorFee = 10

        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await mediator.setConfirmTransactionAfterDisputeFeeResponse(mediatorFee)

        let tx = await protocol.confirmTransaction(transaction.id, { from: buyer })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmedAfterDispute).args
        assert.equal(eventArgs.id.toNumber(), transaction.id)
        assert.equal(eventArgs.mediatorFee.toNumber(), mediatorFee)
      })

      it("transfers the tokens to the seller", async () => {
        let mediatorFee = 10

        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await mediator.setConfirmTransactionAfterDisputeFeeResponse(mediatorFee)
        await protocol.confirmTransaction(transaction.id, { from: buyer })

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(seller, protocol), transaction.amount - mediatorFee)
      })

      it("collects 0 fee when mediator raises an error", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await mediator.setRaiseError(true)

        let tx = await protocol.confirmTransaction(transaction.id, { from: buyer })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmedAfterDispute).args

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
        assert.equal(await $util.getBalance(seller, protocol), transaction.amount)
        assert.equal(eventArgs.mediatorFee.toNumber(), 0)
      })

      it("collects 0 fee when mediator returns a fee higher than the transaction amount", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Disputed
        })

        await mediator.setConfirmTransactionAfterDisputeFeeResponse(transaction.amount + 1)

        let tx = await protocol.confirmTransaction(transaction.id, { from: buyer })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmedAfterDispute).args

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
        assert.equal(await $util.getBalance(seller, protocol), transaction.amount)
        assert.equal(eventArgs.mediatorFee.toNumber(), 0)
      })
    })

    describe("when state is Escalated", () => {
      it("fails before mediation expiry", async () => {
        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        // Set expiry to an 10 seconds
        mediator.setMediationExpiryResponse(10)

        await $util.assertVMExceptionAsync(protocol.confirmTransaction(transaction.id, { from: buyer }))
      })

      it("calls the mediator for the mediation expiry", async () => {
        let mediationExpiry = 10 * 60 // 10 minutes

        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)
        await protocol.confirmTransaction(transaction.id, { from: buyer })

        assert.isNotNull(await $util.eventFromContract(mediator, "MediationExpiryCalled"))
      })

      it("emits the TransactionConfirmedAfterEscalation event", async () => {
        let mediationExpiry = 10 * 60 // 10 minutes

        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })

        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)

        let tx = await protocol.confirmTransaction(transaction.id, { from: buyer })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionConfirmedAfterEscalation).args
        assert.equal(eventArgs.id.toNumber(), transaction.id)
      })

      it("transfers the tokens to the seller", async () => {
        let mediationExpiry = 10 * 60 // 10 minutes

        let {
          protocol,
          transaction,
          mediator
        } = await $util.buildTransaction(buyer, seller, {
          finalState: $util.states.Escalated
        })
        await mediator.setMediationExpiryResponse(mediationExpiry)
        $util.advanceTime(mediationExpiry)

        await protocol.confirmTransaction(transaction.id, { from: buyer })

        assert.equal(await $util.getBalance(protocol.address, protocol), 0)
        assert.equal(await $util.getBalance(mediator.address, protocol), 0)
        assert.equal(await $util.getBalance(buyer, protocol), 0)
        assert.equal(await $util.getBalance(seller, protocol), transaction.amount)
      })
    })
  })
})
