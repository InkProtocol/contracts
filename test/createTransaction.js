const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")
const Mediator = artifacts.require("./mocks/MediatorMock.sol")
const Owner = artifacts.require("./mocks/OwnerMock.sol")
const Policy = artifacts.require("./mocks/PolicyMock.sol")

contract("InkProtocol", (accounts) => {
  let protocol,
      mediator,
      owner,
      policy,
      buyer,
      seller,
      amount,
      metadata

  beforeEach(async () => {
    protocol = await InkProtocol.new()
    mediator = (await Mediator.new()).address
    policy = (await Policy.new()).address
    buyer = accounts[1]
    seller = accounts[2]
    owner = 0
    amount = 100
    metadata = $util.metadataToHash({ title: "metadata" })
  })

  describe("#createTransaction()", () => {
    it("fails when seller address is invalid", async () => {
      seller = 0

      await protocol.transfer(buyer, amount)

      await $util.assertVMExceptionAsync(protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer }))
    })

    it("fails when seller and buyer are the same", async () => {
      seller = buyer

      await protocol.transfer(buyer, amount)

      await $util.assertVMExceptionAsync(protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer }))
    })

    it("fails when owner and buyer are the same", async () => {
      owner = buyer

      await protocol.transfer(buyer, amount)

      await $util.assertVMExceptionAsync(protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer }))
    })

    it("fails when owner and seller are the same", async () => {
      owner = seller

      await protocol.transfer(buyer, amount)

      await $util.assertVMExceptionAsync(protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer }))
    })

    it("fails when amount is 0", async () => {
      amount = 0

      await protocol.transfer(buyer, amount)

      await $util.assertVMExceptionAsync(protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer }))
    })

    it("fails when buyer does not have enough tokens", async () => {
      await protocol.transfer(buyer, amount - 1)

      await $util.assertVMExceptionAsync(protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer }))
    })

    it("fails when mediator is not specified but policy is", async () => {
      mediator = 0

      await protocol.transfer(buyer, amount)

      await $util.assertVMExceptionAsync(protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer }))
    })

    it("increments the global transaction ID for the next transaction", async () => {
      await protocol.transfer(buyer, amount * 2)

      let tx1 = await protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer })
      let eventArgs1 = $util.eventFromTx(tx1, $util.events.TransactionInitiated).args
      assert.equal(eventArgs1.id.toNumber(), 0)

      let tx2 = await protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer })
      let eventArgs2 = $util.eventFromTx(tx2, $util.events.TransactionInitiated).args
      assert.equal(eventArgs2.id.toNumber(), 1)
    })

    it("emits the TransactionInitiated event", async () => {
      await protocol.transfer(buyer, amount)

      let tx = await protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer })
      let eventArgs = $util.eventFromTx(tx, $util.events.TransactionInitiated).args

      assert.equal(eventArgs.id.toNumber(), 0)
      assert.equal(eventArgs.owner, owner)
      assert.equal(eventArgs.buyer, buyer)
      assert.equal(eventArgs.seller, seller)
      assert.equal(eventArgs.amount, amount)
      assert.equal(eventArgs.policy, policy)
      assert.equal(eventArgs.mediator, mediator)
      assert.equal(eventArgs.metadata, metadata)
    })

    it("transfers buyer's tokens to escrow", async () => {
      await protocol.transfer(buyer, amount)

      await protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer })

      assert.equal(await $util.getBalance(buyer, protocol), 0)
      assert.equal(await $util.getBalance(protocol.address, protocol), amount)
    })

    it("returns the transaction id", async() => {
      // Create a transaction that will have id 0.
      await protocol.transfer(buyer, amount)
      await protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer })

      // Next transaction will id 1.
      owner = await Owner.new()
      await protocol.transfer(owner.address, amount)
      await owner.proxyCreateTransaction(protocol.address, seller, amount, metadata, 0, 0, 0)

      let eventArgs = (await $util.eventFromContract(owner, "TransactionCreated")).args
      assert.equal(eventArgs.transactionId.toNumber(), 1)
    })

    describe("when mediator is specified", () => {
      it("fails when policy is not specified", async () => {
        policy = 0

        await protocol.transfer(buyer, amount)

        await $util.assertVMExceptionAsync(protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer }))
      })

      it("fails when mediator rejects the transaction", async () => {
        await protocol.transfer(buyer, amount)

        await Mediator.at(mediator).setRequestMediatorResponse(false)

        await $util.assertVMExceptionAsync(protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer }))
      })

      it("passes the transaction's id, amount, and owner to the mediator", async () => {
        await protocol.transfer(buyer, amount)

        await protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer })

        let eventArgs = (await $util.eventFromContract(Mediator.at(mediator), "RequestMediatorCalled")).args

        assert.equal(eventArgs.transactionId.toNumber(), 0)
        assert.equal(eventArgs.transactionAmount.toNumber(), amount)
        assert.equal(eventArgs.transactionOwner, 0)
      })

      it("emits the TransactionInitiated event with mediator and policy", async () => {
        await protocol.transfer(buyer, amount)

        let tx = await protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionInitiated).args

        assert.equal(eventArgs.policy, policy)
        assert.equal(eventArgs.mediator, mediator)
      })
    })

    describe("when owner is specified", () => {
      beforeEach(async () => {
        owner = (await Owner.new()).address
      })

      it("passes the transaction's id and buyer to the owner", async () => {
        await protocol.transfer(buyer, amount)

        let tx = await protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer })
        let eventArgs = (await $util.eventFromContract(Owner.at(owner), "AuthorizeTransactionCalled")).args

        assert.equal(eventArgs.transactionId.toNumber(), 0)
        assert.equal(eventArgs.buyer, buyer)
      })

      it("emits the TransactionInitiated event with owner", async () => {
        await protocol.transfer(buyer, amount)

        let tx = await protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer })
        let eventArgs = $util.eventFromTx(tx, $util.events.TransactionInitiated).args

        assert.equal(eventArgs.owner, owner)
      })

      it("fails when the owner rejects the transaction", async () => {
        await protocol.transfer(buyer, amount)

        await Owner.at(owner).setAuthorizeTransactionResponse(false)

        await $util.assertVMExceptionAsync(protocol.createTransaction(seller, amount, metadata, policy, mediator, owner, { from: buyer }))
      })
    })
  })
})
