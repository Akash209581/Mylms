import { api } from './api'
import { clearCurrentUser, getCurrentUser } from './session'

jest.mock('./api', () => ({ api: { get: jest.fn() } }))
const get = api.get as jest.Mock

beforeEach(() => {
  clearCurrentUser()
  localStorage.clear()
  get.mockReset()
})

test('shares pending profile requests and caches their result', async () => {
  get.mockResolvedValue({ data: { id: 1 } })
  const first = getCurrentUser()
  expect(getCurrentUser()).toBe(first)
  await first
  await expect(getCurrentUser()).resolves.toEqual({ id: 1 })
  expect(get).toHaveBeenCalledTimes(1)
})

test('a cleared session cannot be repopulated by an old request', async () => {
  let resolveOld!: (value: any) => void
  let resolveNew!: (value: any) => void
  get.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
  const old = getCurrentUser()
  const rejected = expect(old).rejects.toThrow('Session changed')
  clearCurrentUser()
  get.mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve }))
  const current = getCurrentUser()
  resolveOld({ data: { id: 1 } })
  await rejected
  expect(localStorage.getItem('user')).toBeNull()
  expect(getCurrentUser()).toBe(current)
  resolveNew({ data: { id: 2 } })
  await current
  expect(JSON.parse(localStorage.getItem('user')!)).toEqual({ id: 2 })
})
