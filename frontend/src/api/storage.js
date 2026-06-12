const TOKEN_KEY = 'rsm_token'
const USER_KEY = 'rsm_user'

export const getTokens = () => {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY))
  } catch {
    return null
  }
}

export const setTokens = ({ access, refresh }) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ access, refresh }))
}

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
