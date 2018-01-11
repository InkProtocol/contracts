const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")

module.exports = (accounts) => {
  beforeEach(async () => {
    token = await InkMock.new()
    user = accounts[1]
    agent = accounts[2]
  })

  describe("#authorizedBy()", () => {
    it("returns true when user is sender", async () => {
      assert.isTrue(await token.authorizedBy(user, { from: user }))
    })

    it("returns true when sender is authorized", async () => {
      await token.authorize(agent, { from: user })

      assert.isTrue(await token.authorizedBy(user, { from: agent }))
    })

    it("returns false when sender is not authorized", async () => {
      assert.isFalse(await token.authorizedBy(user, { from: agent }))
    })

    it("fails on bad user address", async () => {
      await $ink.assertVMExceptionAsync("revert", token.deauthorize(0))
    })
  })
}
