# koa-token-bucket



Rate limiter middleware for koa.

## Installation

```bash
# npm
$ npm install koa-token-bucket
# yarn
$ yarn add koa-token-bucket
```

## Example

### With a Redis driver

```js
const Koa = require("koa");
const Redis = require("ioredis");
const app = new Koa();
const tokenBucket = require("koa-token-bucket");
//import tokenBucket from "koa-token-bucket";
// apply rate limit
app.use(
  tokenBucket({
    driver: "redis",
    redis: new Redis(),
    capacity: 100, //总令牌桶数
    rate: 10, //1秒生成多少个令牌
    errorMessage: "Sometimes You Just Have to Slow Down.",
    id: (ctx) => ctx.ip,
    headers: {
      rate: "X-RateLimit-Rate",
      tokens: "X-RateLimit-Tokens",
      capacity: "X-RateLimit-Capacity",
    },
    disableHeader: false,
    whitelist: (ctx) => {
      // some logic that returns a boolean
    },
    blacklist: (ctx) => {
      // some logic that returns a boolean
    },
  })
);

// response middleware
app.use(async (ctx) => {
  ctx.body = "Stuff!";
});

// run server
app.listen(3000, () => console.log("listening on port 3000"));
```

### With a Memory driver

```js
const Koa = require("koa");
const Redis = require("ioredis");
const app = new Koa();
const tokenBucket = require("koa-token-bucket");
//import tokenBucket from "koa-token-bucket";
// apply rate limit
app.use(
  tokenBucket({
    driver: "memory",
    capacity: 100, //总令牌桶数
    rate: 10, //1秒生成多少个令牌
    errorMessage: "Sometimes You Just Have to Slow Down.",
    id: (ctx) => ctx.ip,
    headers: {
      rate: "X-RateLimit-Rate",
      tokens: "X-RateLimit-Tokens",
      capacity: "X-RateLimit-Capacity",
    },
    disableHeader: false,
    whitelist: (ctx) => {
      // some logic that returns a boolean
    },
    blacklist: (ctx) => {
      // some logic that returns a boolean
    },
  })
);

// response middleware
app.use(async (ctx) => {
  ctx.body = "Stuff!";
});

// run server
app.listen(3000, () => console.log("listening on port 3000"));
```

## Options

- `capacity` capacity number of requests ['X-RateLimit-Capacity']
- `rate` rate timestamp ['X-RateLimit-Rate']
- `tokens` tokens number of requests ['X-RateLimit-Tokens']
- `errorMessage` custom error message
- `id` id to compare requests [ip]
- `headers` custom header names
- `disableHeader` set whether send the `capacity, rate, tokens` headers [false]
- `whitelist` if function returns true, middleware exits before limiting
- `blacklist` if function returns true, `403` error is thrown
- `throw` call ctx.throw if true

## Responses

Example 200 with header fields:

```
HTTP/1.1 200 OK
X-Powered-By: koa
X-RateLimit-Rate: 10
X-RateLimit-Tokens: 99
X-RateLimit-Capacity: 100
Content-Type: text/plain; charset=utf-8
Content-Length: 6
Date: Wed, 13 Nov 2013 21:22:13 GMT
Connection: keep-alive

Stuff!
```

Example 429 response:

```
HTTP/1.1 429 Too Many Requests
X-Powered-By: koa
X-RateLimit-Rate: 10
X-RateLimit-Tokens: 0
X-RateLimit-Capacity: 100
Content-Type: text/plain; charset=utf-8
Content-Length: 39
Retry-After: 7
Date: Wed, 13 Nov 2013 21:21:48 GMT
Connection: keep-alive

Rate limit exceeded
```

## License

[MIT](LICENSE)

##
