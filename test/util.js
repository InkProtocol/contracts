const { promisify } = require("util")
const EthereumUtil = require("ethereumjs-util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")
const Mediator = artifacts.require("./mocks/MediatorMock.sol")
const Policy = artifacts.require("./mocks/PolicyMock.sol")
const Owner = artifacts.require("./mocks/OwnerMock.sol")

const InkEvents = {
  TransactionInitiated: "TransactionInitiated",
  TransactionAccepted: "TransactionAccepted",
  TransactionDisputed: "TransactionDisputed",
  TransactionEscalated: "TransactionEscalated",
  TransactionRevoked: "TransactionRevoked",
  TransactionRefundedByMediator: "TransactionRefundedByMediator",
  TransactionSettledByMediator: "TransactionSettledByMediator",
  TransactionConfirmedByMediator: "TransactionConfirmedByMediator",
  TransactionConfirmed: "TransactionConfirmed",
  TransactionRefunded: "TransactionRefunded",
  TransactionConfirmedAfterExpiry: "TransactionConfirmedAfterExpiry",
  TransactionConfirmedAfterDispute: "TransactionConfirmedAfterDispute",
  TransactionRefundedAfterDispute: "TransactionRefundedAfterDispute",
  TransactionRefundedAfterExpiry: "TransactionRefundedAfterExpiry",
  TransactionConfirmedAfterEscalation: "TransactionConfirmedAfterEscalation",
  TransactionRefundedAfterEscalation: "TransactionRefundedAfterEscalation",
  TransactionSettled: "TransactionSettled",
  FeedbackUpdated: "FeedbackUpdated",
  AccountLinked: "AccountLinked"
}

const InkStates = {
  Null: 0,
  Initiated: 1,
  Accepted: 2,
  Disputed: 3,
  Escalated: 4,
  Revoked: 5,
  RefundedByMediator: 6,
  SettledByMediator: 7,
  ConfirmedByMediator: 8,
  Confirmed: 9,
  Refunded: 10,
  ConfirmedAfterExpiry: 11,
  ConfirmedAfterDispute: 12,
  RefundedAfterDispute: 13,
  RefundedAfterExpiry: 14,
  ConfirmedAfterEscalation: 15,
  RefundedAfterEscalation: 16,
  Settled: 17
}

function forEachState(callback) {
  forEachStateExcept([], callback)
}

function forEachStateExcept(...except) {
  let callback = except.pop()

  for (let state in InkStates) {
    if (except.indexOf(InkStates[state]) > -1) {
      continue
    }

    callback(state, InkStates[state])
  }
}

function eventsFromTx(tx, eventName) {
  if (eventName == null) {
    return tx.logs
  }

  let events = []

  for (let log of tx.logs) {
    if (log.event === eventName) {
      events.push(log)
    }
  }

  return events
}

function eventFromTx(tx, eventName) {
  let events = eventsFromTx(tx, eventName)

  assert.equal(events.length, 1, `Expected 1 '${eventName}' event, but found ${events.length}`)

  return events[0]
}

function getTransactionIdFromTx(tx) {
  return eventFromTx(tx, InkEvents.TransactionInitiated).args.id.toNumber()
}

async function eventsFromContract(contract, eventName, args = {}) {
  let events = await filterGetSync(contract[eventName](args, { fromBlock: 0 }))

  return events
}

async function eventFromContract(contract, eventName, args = {}) {
  let events = await eventsFromContract(contract, eventName, args)

  assert.equal(events.length, 1, `Expected 1 '${eventName}' event, but found ${events.length}`)

  return events[0]
}


function filterGetSync(filter) {
  return new Promise((resolve, reject) => {
    filter.get((error, logs) => {
      if (error) {
        reject(error)
      } else {
        resolve(logs)
      }
    })
  })
}

async function getTransaction(id, contract) {
  let createEvents = await filterGetSync(contract.TransactionInitiated({ id: id }, { fromBlock: 0 }))

  assert.notEqual(createEvents.length, 0, `Could not find transaction id ${id}`)
  assert.isAtMost(createEvents.length, 1, `More than one transactions created with id ${id}`)

  let transaction = {
    id: createEvents[0].args.id.toNumber(),
    creator: createEvents[0].args.creator,
    buyer: createEvents[0].args.buyer,
    seller: createEvents[0].args.seller,
    policy: createEvents[0].args.policy,
    mediator: createEvents[0].args.mediator,
    amount: createEvents[0].args.amount,
    metadata: createEvents[0].args.metadata,
    state: InkStates.Initiated
  }

  let transientStates = {
    [InkEvents.TransactionAccepted]: InkStates.Accepted,
    [InkEvents.TransactionDisputed]: InkStates.Disputed,
    [InkEvents.TransactionEscalated]: InkStates.Escalated
  }
  for (event in transientStates) {
    if ((await filterGetSync(contract[event]({ id: id }, { fromBlock: 0 }))).length == 1) {
      transaction.state = transientStates[event]
    }
  }

  let finalStates = {
    [InkEvents.TransactionRevoked]: InkStates.Revoked,
    [InkEvents.TransactionRefundedByMediator]: InkStates.RefundedByMediator,
    [InkEvents.TransactionSettledByMediator]: InkStates.SettledByMediator,
    [InkEvents.TransactionConfirmedByMediator]: InkStates.ConfirmedByMediator,
    [InkEvents.TransactionConfirmed]: InkStates.Confirmed,
    [InkEvents.TransactionRefunded]: InkStates.Refunded,
    [InkEvents.TransactionConfirmedAfterExpiry]: InkStates.ConfirmedAfterExpiry,
    [InkEvents.TransactionConfirmedAfterDispute]: InkStates.ConfirmedAfterDispute,
    [InkEvents.TransactionRefundedAfterDispute]: InkStates.RefundedAfterDispute,
    [InkEvents.TransactionRefundedAfterExpiry]: InkStates.RefundedAfterExpiry,
    [InkEvents.TransactionConfirmedAfterEscalation]: InkStates.ConfirmedAfterEscalation,
    [InkEvents.TransactionRefundedAfterEscalation]: InkStates.RefundedAfterEscalation,
    [InkEvents.TransactionSettled]: InkStates.Settled
  }
  for (event in finalStates) {
    if ((await filterGetSync(contract[event]({ id: id }, { fromBlock: 0 }))).length == 1) {
      transaction.state = finalStates[event]
    }
  }

  return transaction
}

async function fetchTransaction(id, contract) {
  return mapResponseToTransaction(id, await contract._fetchTransaction.call(id))
}

async function getBalance(address, contract) {
  return (await contract.balanceOf.call(address)).toNumber()
}

function assertVMException(callback) {
  try {
    callback()
  } catch(error) {
    assert.equal(error.message, "VM Exception while processing transaction: revert")
    return
  }
  assert.fail(`Expected VM exception (revert) to be thrown`)
}

async function assertVMExceptionAsync(promise) {
  try {
    await promise
  } catch(error) {
    assert.equal(error.message, "VM Exception while processing transaction: revert")
    return
  }
  assert.fail("Expected VM exception (revert) to be thrown")
}

async function advanceTime(seconds) {
  await promisify(web3.currentProvider.sendAsync)({
    jsonrpc: "2.0",
    method: "evm_increaseTime",
    params: [seconds],
    id: 0
  })
}

function metadataToHash(metadata) {
  return EthereumUtil.bufferToHex(EthereumUtil.sha3(JSON.stringify(metadata)))
}

async function buildTransaction(buyer, seller, options = {}) {
  if (options.state && Object.values(InkStates).indexOf(options.finalState) < 0) {
    throw(`Unknown final state: ${options.finalState}`)
  }

  let protocol = options.protocol || await InkProtocol.new()

  let policy, policyAddress = 0
  let mediator, mediatorAddress = 0
  if (options.mediator) {
    mediator = options.mediator
    mediatorAddress = mediator.address
  } else if (options.mediator !== false) {
    mediator = await Mediator.new()
    mediatorAddress = mediator.address
  }

  if (mediator) {
    if (options.policy) {
      policy = options.policy
    } else {
      policy = await Policy.new()
    }
    policyAddress = policy.address
  }

  let amount = options.amount || 100
  let metadata = metadataToHash(options.metadata || { title: "Title" })
  let owner, ownerAddress = 0

  if (options.owner === true) {
    owner = await Owner.new()
    ownerAddress = owner.address
  } else if (options.owner) {
    owner = options.owner
    ownerAddress = owner.address
  }

  await protocol.transfer(buyer, amount)

  let createTx = await protocol.createTransaction(
    seller,
    amount,
    metadata,
    policyAddress,
    mediatorAddress,
    ownerAddress,
    { from: buyer }
  )

  let transactionId = getTransactionIdFromTx(createTx)

  if (options.finalState) {
    await moveTransactionToState(protocol, policy, mediator, amount, transactionId, options.finalState, buyer, seller)
  }

  let transaction = await getTransaction(transactionId, protocol)

  return {
    transaction: transaction,
    protocol: protocol,
    policy: policy,
    mediator: mediator,
    owner: owner
  }
}

async function moveTransactionToState(protocol, policy, mediator, amount, transactionId, state, buyer, seller) {
  if (state == InkStates.Null || state == InkStates.Initiated) {
    return
  }

  if (state == InkStates.Revoked) {
    await protocol.revokeTransaction(transactionId, { from: buyer })
    return
  }

  await protocol.acceptTransaction(transactionId, { from: seller })

  if (state == InkStates.Accepted) {
    return
  }

  if (state == InkStates.Confirmed) {
    await protocol.confirmTransaction(transactionId, { from: buyer })
    return
  }

  if (state == InkStates.Refunded) {
    await protocol.refundTransaction(transactionId, { from: seller })
    return
  }

  if (state == InkStates.ConfirmedAfterExpiry) {
    await advanceExpiry(policy.transactionExpiry)

    await protocol.confirmTransactionAfterExpiry(transactionId, { from: seller })
    return
  }

  await advanceExpiry(policy.fulfillmentExpiry)

  await protocol.disputeTransaction(transactionId, { from: buyer })

  if (state == InkStates.Disputed) {
    return
  }

  if (state == InkStates.ConfirmedAfterDispute) {
    await protocol.confirmTransaction(transactionId, { from: buyer })
    return
  }

  if (state == InkStates.RefundedAfterDispute) {
    await protocol.refundTransaction(transactionId, { from: seller })
    return
  }

  if (state == InkStates.RefundedAfterExpiry) {
    await advanceExpiry(policy.escalationExpiry)

    await protocol.refundTransactionAfterExpiry(transactionId, { from: seller })
    return
  }

  await protocol.escalateDisputeToMediator(transactionId, { from: seller })

  if (state == InkStates.Escalated) {
    return
  }

  await advanceExpiry(mediator.mediationExpiry)

  if (state == InkStates.ConfirmedAfterEscalation) {
    await protocol.confirmTransaction(transactionId, { from: buyer })
    return
  }

  if (state == InkStates.RefundedAfterEscalation) {
    await protocol.refundTransaction(transactionId, { from: seller })
    return
  }

  if (state == InkStates.Settled) {
    await protocol.settleTransaction(transactionId, { from: buyer })
    return
  }
}

function mapResponseToTransaction(id, response) {
  return {
    id: id,
    creator: response[0],
    buyer: response[1],
    seller: response[2],
    mediator: response[3],
    state: response[4].toNumber(),
    amount: response[5].toNumber(),
    metadata: response[6]
  }
}

async function advanceExpiry(expiryFunction) {
  let expiry = 0

  try {
    expiry = (await expiryFunction()).toNumber()
  } catch(error) {
    // do nothing
  }

  if (expiry > 0) {
    advanceTime(expiry)
  }
}

module.exports = {
  events: InkEvents,
  states: InkStates,
  eventFromTx: eventFromTx,
  eventsFromTx: eventsFromTx,
  eventsFromContract: eventsFromContract,
  eventFromContract: eventFromContract,
  getTransactionIdFromTx: getTransactionIdFromTx,
  getTransaction: getTransaction,
  getBalance: getBalance,
  advanceTime: advanceTime,
  metadataToHash: metadataToHash,
  assertVMException: assertVMException,
  assertVMExceptionAsync: assertVMExceptionAsync,
  buildTransaction: buildTransaction,
  forEachState: forEachState,
  forEachStateExcept: forEachStateExcept
}
