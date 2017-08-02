import PkgInfo from "../pkg-info.js"
import Runtime from "../runtime.js"
import Wrapper from "../wrapper.js"

import captureStackTrace from "../error/capture-stack-trace.js"
import compiler from "../caching-compiler.js"
import createOptions from "../util/create-options.js"
import encodeIdent from "../util/encode-ident.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import isObject from "../util/is-object.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import md5 from "../util/md5.js"
import rootModule from "../root-module.js"
import vm from "vm"
import wrap from "../util/wrap.js"

const esmPkgMain = __non_webpack_module__.filename

if (rootModule.filename === null &&
    rootModule.id === "<repl>" &&
    rootModule.loaded === false &&
    rootModule.parent === void 0 &&
    rootModule.children.some((child) => child.filename === esmPkgMain)) {
  // Enable ESM in the Node REPL by loading @std/esm upon entering.
  // Custom REPLs can still define their own eval functions to bypass this.
  const md5Hash = md5(Date.now()).slice(0, 3)
  const pkgInfo = PkgInfo.get("")
  const runtimeAlias = encodeIdent("_" + md5Hash)

  const managerWrapper = function (manager, func, args) {
    const wrapped = Wrapper.find(vm, "createScript", pkgInfo.range)
    return wrapped.call(this, manager, func, args)
  }

  const methodWrapper = function (manager, func, args) {
    const code = args[0]
    const options = createOptions(args[1])

    if (options.produceCachedData === void 0) {
      options.produceCachedData = true
    }

    const cache = pkgInfo.cache
    const cacheFileName = getCacheFileName(null, code, pkgInfo)
    const cacheValue = cache[cacheFileName]
    const pkgOptions = pkgInfo.options

    let output

    if (isObject(cacheValue)) {
      output = cacheValue.code
      if (options.produceCachedData === true &&
          options.cachedData === void 0 &&
          cacheValue.data !== void 0) {
        options.cachedData = cacheValue.data
      }
    } else {
      const compilerOptions = {
        cacheFileName,
        pkgInfo,
        runtimeAlias
      }

      if (pkgOptions.debug) {
        output = compiler.compile(code, compilerOptions).code
      } else {
        try {
          output = compiler.compile(code, compilerOptions).code
        } catch (e) {
          captureStackTrace(e, manager)
          throw maskStackTrace(e, code)
        }
      }
    }

    output =
      '"use strict";var ' + runtimeAlias + "=" + runtimeAlias +
      "||[module.exports,module.exports={}][0];" + output

    let result

    if (pkgOptions.debug) {
      result = func.call(this, output, options)
    } else {
      try {
        result = func.call(this, output, options)
      } catch (e) {
        captureStackTrace(e, manager)
        throw maskStackTrace(e, code)
      }
    }

    const runWrapper = function (func, args) {
      if (pkgOptions.debug) {
        return func.apply(this, args)
      }

      try {
        return func.apply(this, args)
      } catch (e) {
        throw maskStackTrace(e, code)
      }
    }

    if (result.cachedDataProduced) {
      cache[cacheFileName].data = result.cachedData
    }

    result.runInContext = wrap(result.runInContext, runWrapper)
    result.runInThisContext = wrap(result.runInThisContext, runWrapper)
    return result
  }

  Wrapper.manage(vm, "createScript", managerWrapper)
  Wrapper.wrap(vm, "createScript", methodWrapper)
  Runtime.enable(rootModule)
}