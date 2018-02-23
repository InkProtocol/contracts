const $util = require("./util")
const InkProtocol = artifacts.require("./mocks/InkProtocolMock.sol")

contract("InkProtocol", (accounts) => {
  let protocol

  beforeEach(async () => {
    protocol = await InkProtocol.new()
  })

  describe("#name()", () => {
    it("specifies the correct total supply", async () => {
      let totalSupply = await protocol.totalSupply()

      assert.equal(totalSupply.toNumber(), 500000000e18)
    })
  })

  describe("#name()", () => {
    it("specifies the token name", async () => {
      let name = await protocol.name()

      assert.equal(name, "Ink Protocol")
    })
  })

  describe("#symbol()", () => {
    it("specifies the token symbol", async () => {
      let symbol = await protocol.symbol()

      assert.equal(symbol, "XNK")
    })
  })

  describe("#decimals()", () => {
    it("specifies the token decimals", async () => {
      let decimals = await protocol.decimals()

      assert.equal(decimals, 18)
    })
  })
})
