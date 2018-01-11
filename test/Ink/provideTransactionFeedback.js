const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")
const commaNumber = require("comma-number")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    token.authorize(agent, { from: buyer })
  })

  buyer = accounts[1]
  seller = accounts[2]
  agent = accounts[3]
  amount = 100
  rating = 5
  comment = $ink.metadataToHash({ comment: "comment" })

  describe('#provideTransactionFeedback()', () => {
    context("when feedback is provided by seller", () => {
      it("should fail", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Confirmed })
        await $ink.assertVMExceptionAsync("revert", token.provideTransactionFeedback(transaction.id, rating, comment, { from: seller }))
      })
    })

    context("when feedback is provided by buyer", () => {
      it("should create/update feedback", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Confirmed })
        let feedback = await token.provideTransactionFeedback(transaction.id, rating, comment, { from: buyer })
        let eventArgs = $ink.eventFromTx(feedback, $ink.events.FeedbackUpdated).args

        // verify feedback updated results
        assert.equal(eventArgs.transactionId, transaction.id)
        assert.equal(eventArgs.rating, rating)
        assert.equal(eventArgs.comment, comment)
      })
    })

    context("when transaction was created by agent and feedback is provided by agent", () => {
      metadata = $ink.metadataToHash({ title: "Title" })

      context("when agent is authorized", () => {
        it("should create/update feedback", async () => {
          await token.transfer(buyer, amount)
          let tx = await token.createTransactionForBuyer(buyer, seller, amount, metadata, 0, 0, { from: agent })
          let txEventArgs = $ink.eventFromTx(tx, $ink.events.TransactionInitiated).args
          let transaction = await $ink.getTransaction(txEventArgs.id.toNumber(), token)
          await token.acceptTransaction(transaction.id, { from: seller })

          let feedback = await token.provideTransactionFeedback(transaction.id, rating, comment, { from: agent })
          let eventArgs = $ink.eventFromTx(feedback, $ink.events.FeedbackUpdated).args

          // verify feedback updated results
          assert.equal(eventArgs.transactionId, transaction.id)
          assert.equal(eventArgs.rating, rating)
          assert.equal(eventArgs.comment, comment)
        })
      })

      context("when agent is not authorized", () => {
        it("should fail", async () => {
          await token.transfer(buyer, amount)
          let tx = await token.createTransactionForBuyer(buyer, seller, amount, metadata, 0, 0, { from: agent })
          let txEventArgs = $ink.eventFromTx(tx, $ink.events.TransactionInitiated).args
          let transaction = await $ink.getTransaction(txEventArgs.id.toNumber(), token)
          await token.acceptTransaction(transaction.id, { from: seller })

          await token.deauthorize(agent, { from: buyer })
          await $ink.assertVMExceptionAsync("revert", token.provideTransactionFeedback(transaction.id, rating, comment, { from: agent }))
        })
      })
    })

    context("when transaction is not completed", () => {
      it("should fail", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })

        await $ink.assertVMExceptionAsync("revert", token.provideTransactionFeedback(transaction.id, rating, comment, { from: buyer }))
      })
    })

    context("when feedback exists", () => {
      newRating = 1
      newComment = $ink.metadataToHash({ comment: "new comment" })


      it("should update feedback", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Confirmed })
        await token.provideTransactionFeedback(transaction.id, rating, comment, { from: buyer })

        let feedback = await token.provideTransactionFeedback(transaction.id, newRating, newComment, { from: buyer })
        let eventArgs = $ink.eventFromTx(feedback, $ink.events.FeedbackUpdated).args

        // verify feedback updated results
        assert.equal(eventArgs.transactionId, transaction.id)
        assert.equal(eventArgs.rating, newRating)
        assert.equal(eventArgs.comment, newComment)
      })
    })

    context("when rate is greater than maximum", () => {
      badRating = 6

      it("should fail", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Confirmed })

        await $ink.assertVMExceptionAsync("revert", token.provideTransactionFeedback(transaction.id, badRating, comment, { from: buyer }))
      })
    })

    context("when rate is less than minimum", () => {
      badRating = 0

      it("should fail", async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Confirmed })

        await $ink.assertVMExceptionAsync("revert", token.provideTransactionFeedback(transaction.id, badRating, comment, { from: buyer }))
      })
    })
  })
}
