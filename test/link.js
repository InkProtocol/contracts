const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")

contract("InkProtocol", (accounts) => {
  let protocol
  let user1 = accounts[1]
  let user2 = accounts[2]

  beforeEach(async () => {
    protocol = await InkProtocol.new()
  })

  describe("#link()", () => {
    it("fails on bad address", async () => {
      await $util.assertVMExceptionAsync(protocol.link(0, { from: user1 }))
    })

    it("fails when user links to itself", async () => {
      await $util.assertVMExceptionAsync(protocol.link(user1, { from: user1 }))
    })

    it("emits AccountLink event", async () => {
      let tx = await protocol.link(user2, { from: user1 })
      let events = $util.eventsFromTx(tx)
      let accountLinkEvent = events[0]

      assert.equal(events.length, 1)
      assert.equal(accountLinkEvent.args.from, user1)
      assert.equal(accountLinkEvent.args.to, user2)
    })
  })
})
