const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")

contract("InkProtocol", (accounts) => {
  let buyer,
      seller,
      unkown,
      rating,
      comment

  beforeEach(() => {
    buyer = accounts[1]
    seller = accounts[2]
    unknown = accounts[accounts.length - 1]
    rating = 5
    comment = $util.metadataToHash({ comment: "comment" })
  })

  describe("#provideTransactionFeedback()", () => {
    it("fails for seller", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Confirmed
      })

      await $util.assertVMExceptionAsync(protocol.provideTransactionFeedback(transaction.id, rating, comment, { from: seller }))
    })

    it("fails for owner", async () => {
      let {
        protocol,
        transaction,
        owner
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Confirmed,
        owner: true
      })

      await $util.assertVMExceptionAsync(owner.proxyProvideTransactionFeedback(protocol.address, transaction.id, rating, comment))
    })

    it("fails for mediator", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Confirmed
      })

      await $util.assertVMExceptionAsync(mediator.proxyProvideTransactionFeedback(protocol.address, transaction.id, rating, comment))
    })

    it("fails for policy", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Confirmed
      })

      await $util.assertVMExceptionAsync(policy.proxyProvideTransactionFeedback(protocol.address, transaction.id, rating, comment))
    })

    it("fails for unknown address", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Confirmed
      })

      await $util.assertVMExceptionAsync(protocol.provideTransactionFeedback(transaction.id, rating, comment, { from: unknown }))
    })

    it("fails when transaction does not exist", async () => {
      let protocol = await InkProtocol.new()

      await $util.assertVMExceptionAsync(protocol.provideTransactionFeedback(0, rating, comment, { from: buyer }))
    })

    it("fails when transaction state is Revoked", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Revoked
      })

      await $util.assertVMExceptionAsync(protocol.provideTransactionFeedback(transaction.id, rating, comment, { from: buyer }))
    })

    it("fails when transaction state is Accepted", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Accepted
      })

      await $util.assertVMExceptionAsync(protocol.provideTransactionFeedback(transaction.id, rating, comment, { from: buyer }))
    })

    it("fails when transaction state is Disputed", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Disputed
      })

      await $util.assertVMExceptionAsync(protocol.provideTransactionFeedback(transaction.id, rating, comment, { from: buyer }))
    })

    it("fails when transaction state is Escalated", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Escalated
      })

      await $util.assertVMExceptionAsync(protocol.provideTransactionFeedback(transaction.id, rating, comment, { from: buyer }))
    })

    it("fails when rating is invalid", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Confirmed
      })

      await $util.assertVMExceptionAsync(protocol.provideTransactionFeedback(transaction.id, 0, comment, { from: buyer }))
      await $util.assertVMExceptionAsync(protocol.provideTransactionFeedback(transaction.id, 6, comment, { from: buyer }))
    })

    it("emits the FeedbackUpdated event", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Confirmed
      })

      let tx = await protocol.provideTransactionFeedback(transaction.id, rating, comment, { from: buyer })

      let eventArgs = await $util.eventFromTx(tx, $util.events.FeedbackUpdated).args
      assert.equal(eventArgs.transactionId, transaction.id)
      assert.equal(eventArgs.rating, rating)
      assert.equal(eventArgs.comment, comment)
    })

    it("allows multiple calls", async () => {
      let rating2 = 2
      let comment2 = $util.metadataToHash({ comment: "comment2" })
      let rating3 = 3
      let comment3 = $util.metadataToHash({ comment: "comment3" })

      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        finalState: $util.states.Confirmed
      })

      await protocol.provideTransactionFeedback(transaction.id, rating, comment, { from: buyer })

      let tx2 = await protocol.provideTransactionFeedback(transaction.id, rating2, comment2, { from: buyer })
      let eventArgs2 = $util.eventFromTx(tx2, $util.events.FeedbackUpdated).args
      assert.equal(eventArgs2.transactionId, transaction.id)
      assert.equal(eventArgs2.rating, rating2)
      assert.equal(eventArgs2.comment, comment2)

      let tx3 = await protocol.provideTransactionFeedback(transaction.id, rating3, comment3, { from: buyer })
      let eventArgs3 = $util.eventFromTx(tx3, $util.events.FeedbackUpdated).args
      assert.equal(eventArgs3.transactionId, transaction.id)
      assert.equal(eventArgs3.rating, rating3)
      assert.equal(eventArgs3.comment, comment3)
    })
  })
})
