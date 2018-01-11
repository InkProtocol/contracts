const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")
const commaNumber = require("comma-number")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    buyer = accounts[1]
    seller = accounts[2]
    agent = accounts[3]
    amount = 100
  })

  describe("#refundTransactionAfterExpiry()", () => {
    this.shouldRefundTransactionAfterExpiry = (sender) => {
      // test refund transaction after expiry in Disputed state
      it("refunds the transaction after expiry in Disputed state", async () => {
        let { transaction, policy, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed })
        let escalationExpiry = await policy.escalationExpiry()
        $ink.advanceTime(escalationExpiry.toNumber())
        await token.refundTransactionAfterExpiry(transaction.id, { from: sender })
        transaction = await $ink.getTransaction(transaction.id, token)
        
        assert.equal(transaction.state, $ink.states.RefundedAfterExpiry)
        
        let refundTransactionAfterExpiryFee = await mediator.refundTransactionAfterExpiryFee.call(transaction.amount)
                
        assert.equal(await $ink.getBalance(buyer, token), amount - refundTransactionAfterExpiryFee)
      })
    }
    
    this.shouldFail = (sender, advanceTime) => {
      it("this should fail", async () => {
        let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed })
        let escalationExpiry = await policy.escalationExpiry()
        if (advanceTime) { $ink.advanceTime(escalationExpiry.toNumber()) }
                  
        await $ink.assertVMExceptionAsync("revert", token.refundTransactionAfterExpiry(transaction.id, { from: sender }))
      })
    }
    
    context("when refund transaction by buyer", () => {
      context("before escalation expiry", () => {
        this.shouldFail(accounts[1], false)
      })
      
      context("after escalation expiry", () => {
        this.shouldRefundTransactionAfterExpiry(accounts[1])
      })
    })
    
    context("when refund transaction by seller", () => {
      context("before escalation expiry", () => {
        this.shouldFail(accounts[2], false)
      })
      
      context("after escalation expiry", () => {
        this.shouldFail(accounts[2], true)
      })
    })
    
    context("when refund transaction by authorized agent", () => {
      beforeEach(async () => {
        await token.authorize(accounts[3], { from: accounts[1] })
      })
      
      context("before escalation expiry", () => {
        this.shouldFail(accounts[3], false)
      })
      
      context("after escalation expiry", () => {
        this.shouldRefundTransactionAfterExpiry(accounts[3])
      })
    })
    
    context("when refund transaction by unauthorized agent", () => {
      context("before escalation expiry", () => {
        this.shouldFail(accounts[3], false)
      })
      
      context("after escalation expiry", () => {
        this.shouldFail(accounts[3], true)
      })
    })
  })
}
