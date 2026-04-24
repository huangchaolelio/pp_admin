const chokidar = require('chokidar')
const bodyParser = require('body-parser')
const chalk = require('chalk')
const path = require('path')
const Mock = require('mockjs')
const http = require('http')
const url = require('url')

const mockDir = path.join(process.cwd(), 'mock')

function registerRoutes(app) {
  let mockLastIndex
  const { mocks } = require('./index.js')

  // pp_admin 自身 API（/dev-api 前缀）
  // char_pp API（/char-pp-api）不走 mock，直接由 devServer.proxy 转发到真实后端
  const allMocks = mocks.map(route => {
    return responseFake(route.url, route.type, route.response)
  })
  for (const mock of allMocks) {
    app[mock.type](mock.url, mock.response)
    mockLastIndex = app._router.stack.length
  }
  const mockRoutesLength = Object.keys(allMocks).length
  return {
    mockRoutesLength: mockRoutesLength,
    mockStartIndex: mockLastIndex - mockRoutesLength
  }
}

function unregisterRoutes() {
  Object.keys(require.cache).forEach(i => {
    if (i.includes(mockDir)) {
      delete require.cache[require.resolve(i)]
    }
  })
}

// for mock server
const responseFake = (url, type, respond) => {
  return {
    url: new RegExp(`${process.env.VUE_APP_BASE_API}${url}`),
    type: type || 'get',
    response(req, res) {
      console.log('request invoke:' + req.path)
      res.json(Mock.mock(respond instanceof Function ? respond(req, res) : respond))
    }
  }
}


module.exports = app => {
  // parse app.body
  // https://expressjs.com/en/4x/api.html#req.body
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({
    extended: true
  }))

  // 手动转发 /char-pp-api 请求到真实后端，保留 URL 原始编码（%2F 不被解码）
  // webpack devServer proxy 使用 url.parse 会解码 %2F，导致含斜杠的 cos_object_key 路径截断
  const charPpTarget = url.parse(process.env.CHAR_PP_PROXY_TARGET || 'http://localhost:8080')
  app.use('/char-pp-api', (req, res) => {
    // req.url 已去掉 /char-pp-api 前缀，保留原始编码（%2F 不被解码）
    const options = {
      hostname: charPpTarget.hostname,
      port: charPpTarget.port || 80,
      path: req.url,
      method: req.method,
      headers: Object.assign({}, req.headers, { host: charPpTarget.host })
    }
    delete options.headers['accept-encoding'] // 避免压缩导致乱码

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res, { end: true })
    })

    proxyReq.on('error', (err) => {
      console.error('[char-pp-proxy]', err.message)
      if (!res.headersSent) res.status(502).json({ error: 'char_pp 服务不可用' })
    })

    // bodyParser 已消费流，从 req.body 重建并发送
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyStr = JSON.stringify(req.body)
      proxyReq.setHeader('Content-Type', 'application/json')
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyStr))
      proxyReq.write(bodyStr)
      proxyReq.end()
    } else {
      req.pipe(proxyReq, { end: true })
    }
  })

  const mockRoutes = registerRoutes(app)
  var mockRoutesLength = mockRoutes.mockRoutesLength
  var mockStartIndex = mockRoutes.mockStartIndex

  // watch files, hot reload mock server
  chokidar.watch(mockDir, {
    ignored: /mock-server/,
    ignoreInitial: true
  }).on('all', (event, path) => {
    if (event === 'change' || event === 'add') {
      try {
        // remove mock routes stack
        app._router.stack.splice(mockStartIndex, mockRoutesLength)

        // clear routes cache
        unregisterRoutes()

        const mockRoutes = registerRoutes(app)
        mockRoutesLength = mockRoutes.mockRoutesLength
        mockStartIndex = mockRoutes.mockStartIndex

        console.log(chalk.magentaBright(`\n > Mock Server hot reload success! changed  ${path}`))
      } catch (error) {
        console.log(chalk.redBright(error))
      }
    }
  })
}
