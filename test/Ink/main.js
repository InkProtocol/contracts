const $ink = require("./utils")
const Ink = artifacts.require("./mocks/Ink.sol")

module.exports = (accounts) => {
  beforeEach(async () => {
    ink = await Ink.new()
  })

  describe("#Ink()", () => {
  })
}
