import realRequire from "./require.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.RealModule
  : shared.module.RealModule = realRequire("module")
