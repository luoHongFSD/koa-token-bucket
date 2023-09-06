/**
 * Module dependencies.
 */

import { resolve } from "path";

const debug = require("debug")("koa-token-bucket");

/**
 * Expose `tokenBucket()`.
 *
 * Initialize ratelimit middleware with the given `opts`:
 *
 * - `db` database connection Redis, Map instance if memory
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
  driver?: "memory" | "redis";
  redis?: any;
  headers?: any;
  id?: (ctx) => string | boolean;
  whitelist?: (ctx) => boolean;
  blacklist?: (ctx) => boolean;
  disableHeader?: boolean;
  status?: number;
  errorMessage?: string;
  throw?: boolean;
  rate?: number;
  capacity?: number;
  namespace?: string;
};

type GetTokenOptions = {
  tokens?:number,
  lastRefillTime?:number,
}

module.exports = function ratelimit(options: RateLimit = {}) {
  const defaultOpts = {
    driver: "memory",
    id: (ctx) => ctx.ip,
    headers: {
      rate: "X-RateLimit-Rate", //1秒生成多少个令牌
      tokens: "X-RateLimit-Tokens", //当前令牌数
      capacity: "X-RateLimit-Capacity", //总令牌桶数
    },
    rate: 10, //1秒生成多少个令牌
    capacity: 100, //总令牌桶数
    namespace: "limit",
  };

  let opts = { ...defaultOpts, ...options };

  const {
    rate = "X-RateLimit-Rate",
    tokens = "X-RateLimit-Tokens",
    capacity = "X-RateLimit-Capacity",
  } = opts.headers;

  const db = createStore(opts.driver, opts.redis, new Map());

  function getTokens(options:GetTokenOptions = {}) {
    const { tokens = opts.capacity, lastRefillTime = Date.now() } = options;
    const currentTime = Date.now();
    const timeElapsed = currentTime - lastRefillTime;
    const tokensToAdd = (timeElapsed * opts.rate) / 1000; // 生成令牌数量
    const currentTokens = Math.min(tokens + tokensToAdd, opts.capacity); //当前令牌数量

    return {
      tokens: currentTokens,
      lastRefillTime: currentTime,
    };
  }

  return async function ratelimit(ctx, next) {
    const id = opts.id(ctx);
    const key = `${opts.namespace}:${id}`;
    const whitelisted =
      typeof opts.whitelist === "function" && (await opts.whitelist(ctx));
    const blacklisted =
      typeof opts.blacklist === "function" && (await opts.blacklist(ctx));

    if (blacklisted) {
      ctx.throw(403, "Forbidden");
    }

    if (id === false || whitelisted) return await next();
    let pass = false;
    let token = getTokens(await db.get(key));
    if (token.tokens < 1) {
      pass = false;
    } else {
      token.tokens -= 1;
      pass = true;
    }

    await db.set(key, token);

    // check if header disabled
    const disableHeader = opts.disableHeader || false;

    let headers = {};
    if (!disableHeader) {
      // header fields
      headers = {
        [rate]: opts.rate,
        [tokens]: token.tokens,
        [capacity]: opts.capacity,
      };

      ctx.set(headers);
    }

    debug("tokens %s/%s %s", tokens, opts.capacity, id);
    if (pass) return await next();

    ctx.status = opts.status || 429;
    ctx.body = opts.errorMessage || `Rate limit exceeded.`;

    if (opts.throw) {
      ctx.throw(ctx.status, ctx.body, { headers });
    }
  };
};

function createStore(driver, redis, map) {
  let db;
  if (driver === "redis") {
    db = {
      async get(key) {
        const value = await redis.get(key)
        if(value){
          return JSON.parse(value)
        }else{
          return undefined
        }
      },
      async set(key, value) {
        return redis.set(key, JSON.stringify(value));
      },
    };
  } else {
    db = {
      async get(key) {
        const value = map.get(key);
        return await value;
      },
      async set(key, value) {
        map.set(key, value);
        return await value;
      },
    };
  }
  return db;
}
