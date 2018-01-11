const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")
const commaNumber = require("comma-number")
const MediatorFeeMock = artifacts.require("./mocks/MediatorFeeMock.sol")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
  })

  buyer = accounts[1]
  seller = accounts[2]
  agent = accounts[3]
  buyerAmount = 50;
  sellerAmount = 50;

  describe("#settleTransactionByMediator()", () => {
    this.shouldFail = (sender) => {
      it("this should fail", async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { amount: 100, token: token, state: $ink.states.Escalated })

        await $ink.assertVMExceptionAsync("revert", token.settleTransactionByMediator(transaction.id, 50, 50), { from: sender })
      })
    }

    context("when confirm transaction by buyer", () => {
      this.shouldFail(buyer)
    })

    context("when confirm transaction by seller", () => {
      this.shouldFail(seller)
    })

    context("when confirm transaction by unauthorized agent", () => {
      this.shouldFail(agent)
    })

    context("when mediator settling the transaction", () => {
      context("before escalation expiry", () => {
        context("when seller and buyer amount are equally splited", () => {
          it("settles the transaction in SettledByMediator state", async () => {
            let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { amount: 100, token: token, state: $ink.states.Escalated })
            let [ buyerMediatorFee, sellerMediatorFee ] = await mediator.settleTransactionByMediatorFee.call(buyerAmount, sellerAmount)
            await mediator.settleTransaction(transaction.id, buyerAmount, sellerAmount, token.address)

            transaction = await $ink.getTransaction(transaction.id, token)
            settledBuyerAmount = buyerAmount - buyerMediatorFee
            settledSellerAmount = sellerAmount - sellerMediatorFee

            assert.equal(transaction.state, $ink.states.SettledByMediator)
            assert.equal(await $ink.getBalance(seller, token), settledSellerAmount)
            assert.equal(await $ink.getBalance(buyer, token), settledBuyerAmount)
            assert.equal(await $ink.getBalance(mediator.address, token), buyerMediatorFee.toNumber() + sellerMediatorFee.toNumber())
          })
        })

        context("when seller and buyer amount are not equally splited", () => {
          it("settles the transaction in SettledByMediator state", async () => {
            buyerAmount = 50;
            sellerAmount = 60;

            let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { amount: buyerAmount + sellerAmount, token: token, state: $ink.states.Escalated })
            let [ buyerMediatorFee, sellerMediatorFee ] = await mediator.settleTransactionByMediatorFee.call(buyerAmount, sellerAmount)
            await mediator.settleTransaction(transaction.id, buyerAmount, sellerAmount, token.address)

            transaction = await $ink.getTransaction(transaction.id, token)
            settledBuyerAmount = buyerAmount - buyerMediatorFee
            settledSellerAmount = sellerAmount - sellerMediatorFee

            assert.equal(transaction.state, $ink.states.SettledByMediator)
            assert.equal(await $ink.getBalance(seller, token), settledSellerAmount)
            assert.equal(await $ink.getBalance(buyer, token), settledBuyerAmount)
            assert.equal(await $ink.getBalance(mediator.address, token), buyerMediatorFee.toNumber() + sellerMediatorFee.toNumber())
          })
        })

        context("when amount does not match", () => {
          it("this should fail", async () => {
            let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { amount: 90, token: token, state: $ink.states.Escalated })

            await $ink.assertVMExceptionAsync("revert", token.settleTransactionByMediator(transaction.id, 50, 50))
          })
        })
      })

      context("after escalation expiry", () => {
        it("settles the transaction in SettledByMediator state", async () => {
          let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { amount: buyerAmount + sellerAmount, token: token, state: $ink.states.Escalated })
          let [ buyerMediatorFee, sellerMediatorFee ] = await mediator.settleTransactionByMediatorFee.call(buyerAmount, sellerAmount)
          await mediator.settleTransaction(transaction.id, buyerAmount, sellerAmount, token.address)

          transaction = await $ink.getTransaction(transaction.id, token)
          settledBuyerAmount = buyerAmount - buyerMediatorFee
          settledSellerAmount = sellerAmount - sellerMediatorFee

          assert.equal(transaction.state, $ink.states.SettledByMediator)
          assert.equal(await $ink.getBalance(seller, token), settledSellerAmount)
          assert.equal(await $ink.getBalance(buyer, token), settledBuyerAmount)
          assert.equal(await $ink.getBalance(mediator.address, token), buyerMediatorFee.toNumber() + sellerMediatorFee.toNumber())
        })
      })

      context("when with different mediatorFee", () => {
        context("when greater than transaction amount", () => {
          it("should fail", async () => {
            buyerFee = buyerAmount + 1;
            sellerFee = sellerAmount + 1;

            mocked_mediator = await MediatorFeeMock.new(buyerFee, sellerFee);

            let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { mediator: mocked_mediator, amount: buyerAmount + sellerAmount, token: token, state: $ink.states.Escalated })

            await $ink.assertVMExceptionAsync("revert", mediator.settleTransaction(transaction.id, buyerAmount, sellerAmount, token.address))
          })
        })

        context("when equals the transaction amount", () => {
          it("settles the transaction in SettledByMediator state", async () => {
            buyerFee = buyerAmount;
            sellerFee = sellerAmount;
            mocked_mediator = await MediatorFeeMock.new(buyerFee, sellerFee);
            totalAmount = buyerAmount + sellerAmount

            let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { mediator: mocked_mediator, amount: totalAmount, token: token, state: $ink.states.Escalated })
            await mediator.settleTransaction(transaction.id, buyerAmount, sellerAmount, token.address)

            transaction = await $ink.getTransaction(transaction.id, token)

            assert.equal(transaction.state, $ink.states.SettledByMediator)
            assert.equal(await $ink.getBalance(seller, token), 0)
            assert.equal(await $ink.getBalance(buyer, token), 0)
            assert.equal(await $ink.getBalance(mediator.address, token), totalAmount)
          })
        })
      })
    })
  })
}
