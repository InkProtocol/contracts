const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")

contract("InkProtocol", (accounts) => {
  let buyer,
      seller,
      uknown

  beforeEach(() => {
    buyer = accounts[1]
    seller = accounts[2]
    unknown = accounts[accounts.length - 1]
  })

  describe("#revokeTransaction()", () => {
    it("fails for seller", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller)

      await $util.assertVMExceptionAsync(protocol.revokeTransaction(transaction.id, { from: seller }))
    })

    it("fails for owner", async () => {
      let {
        protocol,
        transaction,
        owner
      } = await $util.buildTransaction(buyer, seller, {
        owner: true
      })

      await $util.assertVMExceptionAsync(owner.proxyRevokeTransaction(protocol.address, transaction.id))
    })

    it("fails for mediator", async () => {
      let {
        protocol,
        transaction,
        mediator
      } = await $util.buildTransaction(buyer, seller)

      await $util.assertVMExceptionAsync(mediator.proxyRevokeTransaction(protocol.address, transaction.id))
    })

    it("fails for policy", async () => {
      let {
        protocol,
        transaction,
        policy
      } = await $util.buildTransaction(buyer, seller)

      await $util.assertVMExceptionAsync(policy.proxyRevokeTransaction(protocol.address, transaction.id))
    })

    it("fails for unknown address", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller)

      await $util.assertVMExceptionAsync(protocol.revokeTransaction(transaction.id, { from: unknown }))
    })

    it("fails when transaction does not exist", async () => {
      let protocol = await InkProtocol.new()

      await $util.assertVMExceptionAsync(protocol.revokeTransaction(0, { from: buyer }))
    })

    it("emits the TransactionRevoked event", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller)

      let tx = await protocol.revokeTransaction(transaction.id, { from: buyer })
      let eventArgs = $util.eventFromTx(tx, $util.events.TransactionRevoked).args

      assert.equal(eventArgs.id, transaction.id)
    })

    it("transfers tokens from escrow back to the buyer (and only buyer)", async () => {
      let transactionAmount = 75

      let {
        protocol,
        mediator,
        transaction
      } = await $util.buildTransaction(buyer, seller, {
        amount: transactionAmount
      })

      await protocol.revokeTransaction(transaction.id, { from: buyer })

      assert.equal(await $util.getBalance(protocol.address, protocol), 0)
      assert.equal(await $util.getBalance(mediator.address, protocol), 0)
      assert.equal(await $util.getBalance(seller, protocol), 0)
      assert.equal(await $util.getBalance(buyer, protocol), transactionAmount)
    })

    it("fails when acceptTransaction is called afterwards", async () => {
      let {
        protocol,
        transaction
      } = await $util.buildTransaction(buyer, seller)

      await protocol.revokeTransaction(transaction.id, { from: buyer })

      await $util.assertVMExceptionAsync(protocol.acceptTransaction(transaction.id, { from: seller }))
    })
  })
})
