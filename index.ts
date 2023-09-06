'use strict'

/**
 * Module dependencies.
 */

const debug = require('debug')('koa-rate-limit')
const ms = require('ms')

import TokenBucket from "./tokenBucket"

/**
 * Expose `ratelimit()`.
 *
 * Initialize ratelimit middleware with the given `opts`:
 *
 * - `db` database connection  Map instance if memory
 * - `id` id to compare requests [ip]
 * - `headers` custom header names
 * - `tokens` tokens number of requests ['X-RateLimit-Tokens']
 * - `rate` rate timestamp ['X-RateLimit-Rate']
 * - `capacity` capacity number of requests ['X-RateLimit-Capacity']
 * - `whitelist` whitelist function [false]
 * - `blacklist` blacklist function [false]
 * - `throw` call ctx.throw if true
 *
 * @param {Object} opts
 * @return {Function}
 * @api public
 */
export type RateLimit = {
  headers?:any,
  id?:(ctx)=>string|boolean,
  whitelist?:(ctx)=>boolean,
  blacklist?:(ctx)=>boolean,
  disableHeader?:boolean,
  status?:number,
  errorMessage?:string,
  throw?:boolean,
  rate?:number,
  capacity?:number,
  namespace?:string
}

module.exports = function ratelimit (opts:RateLimit = {}) {
  const defaultOpts = {
    id: ctx => ctx.ip,
    headers: {
      rate: 'X-RateLimit-Rate',   //1秒生成多少个令牌
      tokens: 'X-RateLimit-Tokens',  //当前令牌数
      capacity: 'X-RateLimit-Capacity' //总令牌桶数
    },
    rate:10, //1秒生成多少个令牌
    capacity:100,   //总令牌桶数
    namespace:'limit'
  }

  opts = { ...defaultOpts, ...opts }

  const {
    rate = 'X-RateLimit-Rate',
    tokens  = 'X-RateLimit-Tokens',
    capacity = 'X-RateLimit-Capacity'
  } = opts.headers

  const db = new Map()
  
  return async function ratelimit (ctx, next) {
    const id = opts.id(ctx)
    const key = `${opts.namespace}:${id}`
    const whitelisted = typeof opts.whitelist === 'function' && await opts.whitelist(ctx)
    const blacklisted = typeof opts.blacklist === 'function' && await opts.blacklist(ctx)

    if (blacklisted) {
      ctx.throw(403, 'Forbidden')
    }

    if (id === false || whitelisted) return await next()
    
     let  tokenBucket = db.get(key)
    if(!tokenBucket){
      tokenBucket = new TokenBucket(opts.capacity,opts.rate)
      db.set(key,tokenBucket)
    }


    // check limit
    const  pass = tokenBucket.processRequest()


    // check if header disabled
    const disableHeader = opts.disableHeader || false

    let headers = {}
    if (!disableHeader) {
      // header fields
      headers = {
        [rate]: opts.rate,
        [tokens]: tokenBucket.tokens,
        [capacity]: opts.capacity
      }

      ctx.set(headers)
    }

    debug('tokens %s/%s %s', tokens, opts.capacity, id)
    if (pass) return await next()

 

    ctx.status = opts.status || 429
    ctx.body = opts.errorMessage || `Rate limit exceeded.`

    if (opts.throw) {
      ctx.throw(ctx.status, ctx.body, { headers })
    }
  }
}