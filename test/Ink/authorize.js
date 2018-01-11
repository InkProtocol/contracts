const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    user = accounts[1]
    agent = accounts[2]
  })

  describe("#authorize()", () => {
    it("authorizes the agent", async () => {
      assert.isFalse(await token.authorizedBy(user, { from: agent }))
      assert.isTrue(await token.authorizedBy(user, { from: user }))

      await token.authorize(agent, { from: user })
      
      assert.isTrue(await token.authorizedBy(user, { from: agent }))
    })

    it("fails on bad agent address", async () => {
      await $ink.assertVMExceptionAsync("revert", token.authorize(0))
    })

    it("fails if agent is the sender", async () => {
      await $ink.assertVMExceptionAsync("revert", token.authorize(user, { from: user }))
    })
  })
}
