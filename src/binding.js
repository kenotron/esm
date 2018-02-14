import getSilent from "./util/get-silent.js"
import isObjectLike from "./util/is-object-like.js"
import setDeferred from "./util/set-deferred.js"
import setGetter from "./util/set-getter.js"
import silent from "./util/silent.js"

let _binding

const ids = ["config", "fs", "icu", "inspector", "natives", "util"]

const map = {
  __proto__: null,
  config: [
    "preserveSymlinks"
  ],
  fs: [
    "getStatValues",
    "internalModuleReadFile",
    "internalModuleReadJSON",
    "internalModuleStat",
    "stat"
  ],
  icu: [
    "toUnicode"
  ],
  inspector: [
    "callAndPauseOnStart"
  ],
  util: [
    "arrow_message_private_symbol",
    "decorated_private_symbol",
    "setHiddenValue"
  ]
}

const binding = ids
  .reduce((binding, id) =>
    setDeferred(binding, id, () => {
      if (! _binding) {
        _binding = getSilent(process, "binding")
      }

      const source = silent(() => _binding.call(process, id))

      if (! isObjectLike(source)) {
        return { __proto__: null }
      }

      const names = map[id]

      if (! names) {
        return source
      }

      const object = { __proto__: null }

      for (const name of names) {
        setGetter(object, name, () => {
          const value = getSilent(source, name)

          return typeof value === "function"
            ? (...args) => value.apply(source, args)
            : value
        })
      }

      return object
    })
  , { __proto__: null })

export default binding
