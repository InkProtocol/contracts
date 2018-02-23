const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")

contract("InkProtocol", (accounts) => {
  let protocol,
      sender,
      recipient,
      agent,
      amount

  beforeEach(async () => {
    protocol = await InkProtocol.new()
    sender = accounts[1]
    recipient = accounts[2]
    agent = accounts[3]
    amount = 10
  })

  describe("#transferFrom()", () => {
    it("fails when recipient is the protocol", async () => {
      recipient = protocol.address

      await protocol.transfer(sender, amount)
      await protocol.approve(agent, amount, { from: sender })

      await $util.assertVMExceptionAsync(protocol.transferFrom(sender, recipient, amount, { from: agent }))
    })

    it("succeeds when recipient is another address", async () => {
      await protocol.transfer(sender, amount)
      await protocol.approve(agent, amount, { from: sender })

      await protocol.transferFrom(sender, recipient, amount, { from: agent })

      assert.equal(await $util.getBalance(sender, protocol), 0)
      assert.equal(await $util.getBalance(recipient, protocol), amount)
    })
  })
})
