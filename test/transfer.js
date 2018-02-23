const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")

contract("InkProtocol", (accounts) => {
  let protocol

  beforeEach(async () => {
    protocol = await InkProtocol.new()
  })

  describe("#transfer()", () => {
    it("fails when sending token to the protocol", async () => {
      await $util.assertVMExceptionAsync(protocol.transfer(protocol.address, 1))
    })

    it("succeeds when sending token to another address", async () => {
      let sender = accounts[0]
      let recipient = accounts[1]
      let amount = 10;
      let originalSenderBalance = await $util.getBalance(accounts[0], protocol)

      await protocol.transfer(recipient, amount, { from: sender })

      assert.equal(await $util.getBalance(sender, protocol), originalSenderBalance - amount)
      assert.equal(await $util.getBalance(recipient, protocol), amount)
    })
  })
})
