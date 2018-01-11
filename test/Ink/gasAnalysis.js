const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")
const MediatorMock = artifacts.require("./mocks/MediatorMock.sol")
const PolicyMock = artifacts.require("./mocks/PolicyMock.sol")
const commaNumber = require("comma-number")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    mediator = await MediatorMock.new()
    policy = await PolicyMock.new()
    metadata = $ink.metadataToHash({title: "Title"})
  })

  buyer = accounts[1]
  seller = accounts[2]
  agent = accounts[3]
  amount = 100

  describe('#gasAnalysis()', () => {
    this.shouldRunAcceptTransactionAnalysis = (sender, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token })
        let tx = await token.acceptTransaction(transaction.id, { from: sender })

        assert.equal(expectedGasUsed, tx.receipt.gasUsed)
      })
    }

    this.shouldRunRevokeTransactionAnalysis = (sender, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token })
        let tx = await token.revokeTransaction(transaction.id, { from: sender })

        assert.equal(expectedGasUsed, tx.receipt.gasUsed)
      })
    }

    this.shouldRunCreateTransactionAnalysis = (sender, withMedAndPol, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        await token.transfer(sender, amount)
        let tx = (withMedAndPol) ? await token.createTransaction(seller, amount, metadata, policy.address, mediator.address, { from: sender }) : await token.createTransaction(seller, amount, metadata, 0, 0, { from: sender })
        eventArgs = $ink.eventFromTx(tx, $ink.events.TransactionInitiated).args

        assert.equal(expectedGasUsed, tx.receipt.gasUsed)
      })
    }

    this.shouldRunCreateTransactionForBuyerAnalysis = (sender, withMedAndPol, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        await token.transfer(buyer, amount)
        let tx = (withMedAndPol) ? await token.createTransactionForBuyer(buyer, seller, amount, metadata, policy.address, mediator.address, { from: sender }) : await token.createTransactionForBuyer(buyer, seller, amount, metadata, 0, 0, { from: sender })
        eventArgs = $ink.eventFromTx(tx, $ink.events.TransactionInitiated).args

        assert.equal(expectedGasUsed, tx.receipt.gasUsed)
      })
    }

    this.shouldRunCreateTransactionForBuyerAndSellerAnalysis = (sender, withMedAndPol, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        await token.transfer(buyer, amount)
        let tx = (withMedAndPol) ? await token.createTransactionForBuyerAndSeller(buyer, seller, amount, metadata, policy.address, mediator.address, { from: sender }) : await token.createTransactionForBuyerAndSeller(buyer, seller, amount, metadata, 0, 0, { from: sender })
        eventArgs = $ink.eventFromTx(tx, $ink.events.TransactionInitiated).args

        assert.equal(expectedGasUsed, tx.receipt.gasUsed)
      })
    }

    this.shouldRunConfirmTransactionAnalysis = (sender, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        let confirmTx = await token.confirmTransaction(transaction.id, { from: sender })

        assert.equal(expectedGasUsed, confirmTx.receipt.gasUsed)
      })
    }

    this.shouldRunConfirmTransactionAfterExpiryAnalysis = (sender, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        let transactionExpiry = await policy.transactionExpiry()
        $ink.advanceTime(transactionExpiry.toNumber())
        let confirmTx = await token.confirmTransactionAfterExpiry(transaction.id, { from: sender })

        assert.equal(expectedGasUsed, confirmTx.receipt.gasUsed)
      })
    }

    this.shouldRunRefundTransactionAnalysis = (sender, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        let refundTx = await token.refundTransaction(transaction.id, { from: sender })

        assert.equal(expectedGasUsed, refundTx.receipt.gasUsed)
      })
    }

    this.shouldRunRefundTransactionAfterExpiryAnalysis = (sender, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed })
        let escalationExpiry = await policy.escalationExpiry()
        $ink.advanceTime(escalationExpiry.toNumber())
        let refundTx = await token.refundTransactionAfterExpiry(transaction.id, { from: sender })

        assert.equal(expectedGasUsed, refundTx.receipt.gasUsed)
      })
    }

    this.shouldRunDisputeTransactionAnalysis = (sender, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        let { transaction, policy } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Accepted })
        let fulfillmentExpiry = await policy.fulfillmentExpiry()
        $ink.advanceTime(fulfillmentExpiry.toNumber())
        let disputeTx = await token.disputeTransaction(transaction.id, { from: sender })

        assert.equal(expectedGasUsed, disputeTx.receipt.gasUsed)
      })
    }

    this.shouldRunEscalateDisputeToMediatorAnalysis = (sender, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        let { transaction } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Disputed })
        let escalateTx = await token.escalateDisputeToMediator(transaction.id, { from: sender })

        assert.equal(expectedGasUsed, escalateTx.receipt.gasUsed)
      })
    }

    this.shouldRunSettleTransactionAnalysis = (sender, expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async () => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated })
        let [ _, mediationExpiry ] = await mediator.requestMediator.call(transaction.id, transaction.amount)
        $ink.advanceTime(mediationExpiry.toNumber())
        let settleTx = await token.settleTransaction(transaction.id, { from: sender })

        assert.equal(expectedGasUsed, settleTx.receipt.gasUsed)
      })
    }

    this.shouldRunConfirmTransactionByMediatorAnalysis = (expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async() => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated })
        let confirmTx = await mediator.confirmTransaction(transaction.id, token.address)

        // check gas use
        assert.equal(expectedGasUsed, confirmTx.receipt.gasUsed)
      })
    }

    this.shouldRunRefundTransactionByMediatorAnalysis = (expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async() => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { token: token, state: $ink.states.Escalated })
        let refundTx = await mediator.refundTransaction(transaction.id, token.address)

        assert.equal(expectedGasUsed, refundTx.receipt.gasUsed)
      })
    }

    this.shouldRunSettleTransactionByMediatorAnalysis = (expectedGasUsed) => {
      it(`uses ${commaNumber(expectedGasUsed)} units of gas`, async() => {
        let { transaction, mediator } = await $ink.createTransaction(buyer, seller, { amount: amount, token: token, state: $ink.states.Escalated })
        let settleTx = await mediator.settleTransaction(transaction.id, 50, 50, token.address)

        assert.equal(expectedGasUsed, settleTx.receipt.gasUsed)
      })
    }

    context("authorize()", () => {
      it(`uses ${commaNumber(43889)} units of gas`, async () => {
        let tx = await token.authorize(agent, { from : buyer })

        assert.equal(43889, tx.receipt.gasUsed)
      })
    })

    context("deauthorize()", () => {
      it(`uses ${commaNumber(28534)} units of gas`, async () => {
        let tx = await token.deauthorize(agent, { from : buyer })

        assert.equal(28534, tx.receipt.gasUsed)
      })
    })

    context("transfer()", () => {
      it(`uses ${commaNumber(51783)} units of gas`, async () => {
        let tx = await token.transfer(buyer, amount)

        assert.equal(51783, tx.receipt.gasUsed)
      })
    })

    context("acceptTransaction()", () => {
      context("by seller", () => {
        this.shouldRunAcceptTransactionAnalysis(seller, 50473)
      })

      context("by agent", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: seller })
        })
        this.shouldRunAcceptTransactionAnalysis(agent, 50893)
      })
    })

    context("revokeTransaction()", () => {
      context("by buyer", () => {
        this.shouldRunRevokeTransactionAnalysis(buyer, 50105)
      })

      context("by agent", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: buyer })
        })
        this.shouldRunRevokeTransactionAnalysis(agent, 50315)
      })
    })

    context("createTransaction()", () => {
      context("by buyer", () => {
        context("with mediator and policy", () => {
          this.shouldRunCreateTransactionAnalysis(buyer, true, 180973)
        })

        context("without mediator and policy", () => {
          this.shouldRunCreateTransactionAnalysis(buyer, false, 150623)
        })
      })
    })

    context("createTransactionForBuyer()", () => {
      context("by agent", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: buyer })
        })

        context("with mediator and policy", () => {
          this.shouldRunCreateTransactionForBuyerAnalysis(agent, true, 203052)
        })

        context("without mediator and policy", () => {
          this.shouldRunCreateTransactionForBuyerAnalysis(agent, false, 172702)
        })
      })
    })

    context("createTransactionForBuyerAndSeller()", () => {
      context("by agent", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: buyer })
          await token.authorize(agent, { from: seller })
        })

        context("with mediator and policy", () => {
          this.shouldRunCreateTransactionForBuyerAndSellerAnalysis(agent, true, 230721)
        })

        context("without mediator and policy", () => {
          this.shouldRunCreateTransactionForBuyerAndSellerAnalysis(agent, false, 192307)
        })
      })
    })

    context("confirmTransaction()", () => {
      context("by buyer", () => {
        this.shouldRunConfirmTransactionAnalysis(buyer, 58424)
      })

      context("by agent", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: buyer })
        })
        this.shouldRunConfirmTransactionAnalysis(agent, 58634)
      })
    })

    context("confirmTransactionAfterExpiry()", () => {
      context("by seller", () => {
        this.shouldRunConfirmTransactionAfterExpiryAnalysis(seller, 59487)
      })

      context("by agent", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: seller })
        })
        this.shouldRunConfirmTransactionAfterExpiryAnalysis(agent, 59697)
      })
    })

    context("refundTransaction()", () => {
      context("by seller", () => {
        this.shouldRunRefundTransactionAnalysis(seller, 58817)
      })

      context("by agent", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: seller })
        })
        this.shouldRunRefundTransactionAnalysis(agent, 59027)
      })
    })

    context("refundTransactionAfterExpiry()", () => {
      context("by buyer", () => {
        this.shouldRunRefundTransactionAfterExpiryAnalysis(buyer, 60155)
      })

      context("by agent", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: buyer })
        })
        this.shouldRunRefundTransactionAfterExpiryAnalysis(agent, 60365)
      })
    })

    context("disputeTransaction()", () => {
      context("by buyer", () => {
        this.shouldRunDisputeTransactionAnalysis(buyer, 37121)
      })

      context("by agent", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: buyer })
        })
        this.shouldRunDisputeTransactionAnalysis(agent, 37541)
      })
    })

    context("escalateDisputeToMediator()", () => {
      context("by seller", () => {
        this.shouldRunEscalateDisputeToMediatorAnalysis(seller, 34756)
      })

      context("by agent", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: seller })
        })
        this.shouldRunEscalateDisputeToMediatorAnalysis(agent, 35176)
      })
    })

    context("settleTrnsaction()", () => {
      context("by buyer", () => {
        this.shouldRunSettleTransactionAnalysis(buyer, 57191)
      })

      context("by seller", () => {
        this.shouldRunSettleTransactionAnalysis(seller, 57585)
      })

      context("by agent authorized by buyer", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: buyer })
        })
        this.shouldRunSettleTransactionAnalysis(agent, 57401)
      })

      context("by agent authorized by seller", () => {
        beforeEach(async () => {
          await token.authorize(agent, { from: seller })
        })
        this.shouldRunSettleTransactionAnalysis(agent, 57795)
      })
    })

    context("confirmTransactionByMediator()", () => {
      this.shouldRunConfirmTransactionByMediatorAnalysis(60513)
    })

    context("refundTransactionByMediator()", () => {
      this.shouldRunRefundTransactionByMediatorAnalysis(60456)
    })

    context("settleTransactionByMediator()", () => {
      this.shouldRunSettleTransactionByMediatorAnalysis(74650)
    })
  })
}
