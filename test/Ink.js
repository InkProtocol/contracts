'use strict';

let files = [
  "./Ink/gasAnalysis",
  "./Ink/authorize",
  "./Ink/deauthorize",
  "./Ink/authorizedBy",
  "./Ink/createTransaction",
  "./Ink/createTransactionForBuyer",
  "./Ink/createTransactionForBuyerAndSeller",
  "./Ink/revokeTransaction",
  "./Ink/acceptTransaction",
  "./Ink/confirmTransaction",
  "./Ink/confirmTransactionAfterExpiry",
  "./Ink/refundTransaction",
  "./Ink/refundTransactionAfterExpiry",
  "./Ink/disputeTransaction",
  "./Ink/escalateDisputeToMediator",
  "./Ink/settleTransaction",
  "./Ink/refundTransactionByMediator",
  "./Ink/confirmTransactionByMediator",
  "./Ink/settleTransactionByMediator",
  "./Ink/provideTransactionFeedback"
]

for (let fileIndex in files) {
  contract("Ink", async (accounts) => {
    require(files[fileIndex]).call(this, accounts)
  })
}
