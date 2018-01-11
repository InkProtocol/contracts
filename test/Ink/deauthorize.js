const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    user = accounts[1]
    agent = accounts[2]
  })

  describe("#deauthorize()", () => {
    it("deauthorizes the agent", async () => {
      await token.authorize(agent, { from: user })
      await token.deauthorize(agent, { from: user })

      assert.isFalse(await token.authorizedBy(user, { from: agent }))
    })

    it("fails on bad agent address", async () => {
      await $ink.assertVMExceptionAsync("revert", token.deauthorize(0))
    })

    it("fails if agent is the sender", async () => {
      await $ink.assertVMExceptionAsync("revert", token.deauthorize(user, { from: user }))
    })
  })
}
