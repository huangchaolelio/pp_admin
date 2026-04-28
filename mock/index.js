const Mock = require('mockjs')

const user = require('./user')

// 所有非 /char-pp-api 前缀的接口都走 mock（登录、权限、用户管理等）
const mocks = [...user]

function mockXHR() {
  Mock.XHR.prototype.proxy_send = Mock.XHR.prototype.send
  Mock.XHR.prototype.send = function() {
    if (this.custom.xhr) {
      this.custom.xhr.withCredentials = this.withCredentials || false
      if (this.responseType) {
        this.custom.xhr.responseType = this.responseType
      }
    }
    this.proxy_send(...arguments)
  }

  function XHR2ExpressReqWrap(respond) {
    return function(options) {
      let result = null
      if (respond instanceof Function) {
        const { body, type, url } = options
        result = respond({
          method: type,
          body: body ? JSON.parse(body) : {},
          query: parseQuery(url)
        })
      } else {
        result = respond
      }
      return Mock.mock(result)
    }
  }

  for (const i of mocks) {
    Mock.mock(new RegExp(i.url), i.type || 'get', XHR2ExpressReqWrap(i.response))
  }
}

function parseQuery(url) {
  const search = url.split('?')[1]
  if (!search) return {}
  const obj = {}
  for (const kv of search.split('&')) {
    const [k, v] = kv.split('=')
    if (k) obj[decodeURIComponent(k)] = v ? decodeURIComponent(v) : ''
  }
  return obj
}

module.exports = { mocks, mockXHR }
