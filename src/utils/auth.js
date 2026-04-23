import Cookies from 'js-cookie'

const TokenKey = 'Admin-Token'

export function getToken() {
  return Cookies.get(TokenKey)
}

export function setToken(token) {
  return Cookies.set(TokenKey, token, { expires: 1 / 12 }) // 2 小时有效期
}

export function removeToken() {
  return Cookies.remove(TokenKey)
}
