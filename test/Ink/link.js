const $ink = require("./utils")
const InkMock = artifacts.require("./mocks/InkMock.sol")

module.exports = (accounts) => {
  beforeEach(async () => {
    ink = await InkMock.new()
    sender = accounts[1]
    user = accounts[2]
    agent = accounts[3]
  })

  describe("#linkWith()", () => {
    it("links user to sender", async () => {
      let tx = await ink.linkWith(user, { from: sender })
      let eventArgs = $ink.eventFromTx(tx, $ink.events.AccountLinked).args

      assert.equal(eventArgs.from, sender)
      assert.equal(eventArgs.to, user)
    })

    it("fails on bad user address", async () => {
      await $ink.assertVMExceptionAsync("revert", ink.linkWith("0x0", { from: sender }))
    })

    it("fails if user is the sender", async () => {
      await $ink.assertVMExceptionAsync("revert", ink.authorize(user, { from: user }))
    })
  })

  describe("#link()", () => {
    it("links user to sender", async () => {
      await ink.authorize(agent, { from: user })

      let tx = await ink.link(user, sender, { from: agent })
      let eventArgs = $ink.eventFromTx(tx, $ink.events.AccountLinked).args

      assert.equal(eventArgs.from, user)
      assert.equal(eventArgs.to, sender)
    })

    it("fails on bad agent address", async () => {
      await ink.authorize(agent, { from: user })

      await $ink.assertVMExceptionAsync("revert", ink.link(user, sender, { from: accounts[4] }))
    })

    it("fails on bad user address", async () => {
      await ink.authorize(agent, { from: user })

      await $ink.assertVMExceptionAsync("revert", ink.link("0x0", sender, { from: agent }))
    })

    it("fails if user is the same as target", async () => {
      await ink.authorize(agent, { from: user })

      await $ink.assertVMExceptionAsync("revert", ink.link(user, user, { from: agent }))
    })
  })
}
