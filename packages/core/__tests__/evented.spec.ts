import { describe, it, expect, vi } from 'vitest'
import { TEvented } from '@soldy/core'

type TestEvents = {
	change: (value: string) => void
	submit: (id: number) => void
	reset: () => void
}

describe('TEvented', () => {
	// --- Базовые операции (on/off/emit) ---

	it('on/emit: подписка и вызов события', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.emit('change', 'hello')

		expect(handler).toHaveBeenCalledWith('hello')
	})

	it('off: отписка от события', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.off('change', handler)
		events.emit('change', 'hello')

		expect(handler).not.toHaveBeenCalled()
	})

	// --- Middleware (use) ---

	it('use: middleware вызывается при emit и получает контекст', () => {
		const events = new TEvented<TestEvents>()
		const middleware = vi.fn()

		events.use(middleware)
		events.emit('change', 'hello')

		expect(middleware).toHaveBeenCalledTimes(1)

		const ctx = middleware.mock.calls[0][0]

		expect(ctx.event).toBe('change')
		expect(ctx.args).toEqual(['hello'])
		expect(ctx.type).toBe('emit')
		expect(ctx.timestamp).toBeGreaterThan(0)
	})

	it('use: middleware вызывается для каждого emit', () => {
		const events = new TEvented<TestEvents>()
		const middleware = vi.fn()

		events.use(middleware)
		events.emit('change', 'a')
		events.emit('submit', 42)
		events.emit('reset')

		expect(middleware).toHaveBeenCalledTimes(3)
		expect(middleware.mock.calls[0][0].event).toBe('change')
		expect(middleware.mock.calls[1][0].event).toBe('submit')
		expect(middleware.mock.calls[2][0].event).toBe('reset')
	})

	it('use: несколько middleware вызываются в порядке регистрации', () => {
		const events = new TEvented<TestEvents>()
		const order: number[] = []
		const mw1 = vi.fn(() => order.push(1))
		const mw2 = vi.fn(() => order.push(2))

		events.use(mw1)
		events.use(mw2)
		events.emit('change', 'x')

		expect(order).toEqual([1, 2])
	})

	it('use: возвращает функцию отписки', () => {
		const events = new TEvented<TestEvents>()
		const middleware = vi.fn()

		const unuse = events.use(middleware)
		unuse()
		events.emit('change', 'x')

		expect(middleware).not.toHaveBeenCalled()
	})

	it('use: отписка не затрагивает другие middleware', () => {
		const events = new TEvented<TestEvents>()
		const mw1 = vi.fn()
		const mw2 = vi.fn()

		events.use(mw1)
		const unuse = events.use(mw2)
		unuse()
		events.emit('change', 'x')

		expect(mw1).toHaveBeenCalledTimes(1)
		expect(mw2).not.toHaveBeenCalled()
	})

	// --- isMuted ---

	it('isMuted: изначально false', () => {
		const events = new TEvented<TestEvents>()

		expect(events.isMuted).toBe(false)
	})

	it('isMuted: true после pause()', () => {
		const events = new TEvented<TestEvents>()

		events.pause()

		expect(events.isMuted).toBe(true)
	})

	it('isMuted: false после pause() + resume()', () => {
		const events = new TEvented<TestEvents>()

		events.pause()
		events.resume()

		expect(events.isMuted).toBe(false)
	})

	// --- pause/resume ---

	it('pause: события не доставляются обработчикам', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.pause()
		events.emit('change', 'hello')

		expect(handler).not.toHaveBeenCalled()
	})

	it('pause: события не доставляются в middleware', () => {
		const events = new TEvented<TestEvents>()
		const middleware = vi.fn()

		events.use(middleware)
		events.pause()
		events.emit('change', 'hello')

		expect(middleware).not.toHaveBeenCalled()
	})

	it('pause+resume: события доставляются после resume', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.pause()
		events.emit('change', 'hello')
		events.resume()
		events.emit('change', 'world')

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith('world')
	})

	it('pause: поддерживает вложенность (счётчик)', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.pause() // muteDepth = 1
		events.pause() // muteDepth = 2
		events.emit('change', 'a')
		events.resume() // muteDepth = 1 — всё ещё muted
		events.emit('change', 'b')

		expect(handler).not.toHaveBeenCalled()

		events.resume() // muteDepth = 0 — размучен
		events.emit('change', 'c')

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith('c')
	})

	it('resume: не уходит в отрицательные значения', () => {
		const events = new TEvented<TestEvents>()

		events.resume() // не должен упасть
		events.resume()

		expect(events.isMuted).toBe(false)
	})

	// --- silent ---

	it('silent: блокирует события внутри колбэка', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.silent(() => {
			events.emit('change', 'hidden')
		})

		expect(handler).not.toHaveBeenCalled()
	})

	it('silent: восстанавливает отправку после выхода', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.silent(() => {
			events.emit('change', 'hidden')
		})
		events.emit('change', 'visible')

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith('visible')
	})

	it('silent: возвращает результат колбэка', () => {
		const events = new TEvented<TestEvents>()

		const result = events.silent(() => 42)

		expect(result).toBe(42)
	})

	it('silent: поддерживает вложенность', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.silent(() => {
			events.silent(() => {
				events.emit('change', 'deep')
			})
			events.emit('change', 'mid')
		})
		events.emit('change', 'outer')

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith('outer')
	})

	// --- relay ---

	it('relay: пробрасывает события из источника', () => {
		const source = new TEvented<TestEvents>()
		const target = new TEvented<{ forwarded: (value: string) => void }>()
		const handler = vi.fn()

		target.on('forwarded', handler)
		target.relay(source, [{ from: 'change', as: 'forwarded' }])
		source.emit('change', 'hello')

		expect(handler).toHaveBeenCalledWith('hello')
	})

	it('relay: пробрасывает событие без переименования', () => {
		const source = new TEvented<TestEvents>()
		const target = new TEvented<TestEvents>()
		const handler = vi.fn()

		target.on('change', handler)
		target.relay(source, ['change'])
		source.emit('change', 'hello')

		expect(handler).toHaveBeenCalledWith('hello')
	})

	it('relay: хук then вызывается до проброса', () => {
		const source = new TEvented<TestEvents>()
		const target = new TEvented<{ forwarded: (value: string) => void }>()
		const hook = vi.fn()
		const handler = vi.fn()

		target.on('forwarded', handler)
		target.relay(source, [{ from: 'change', as: 'forwarded', then: hook }])

		const callOrder: string[] = []

		hook.mockImplementation(() => callOrder.push('hook'))
		handler.mockImplementation(() => callOrder.push('handler'))

		source.emit('change', 'hello')

		expect(callOrder).toEqual(['hook', 'handler'])
	})

	// --- relay: сверка правил и обработчиков с картами событий ---

	// Негативные случаи ловит не vitest, а «Типы — Core»: tsc проверяет и
	// __tests__, а неиспользованный @ts-expect-error — тоже ошибка. Ослабленная
	// сверка уронит типы, а не пройдёт молча.
	describe('relay: сверка с картами событий', () => {
		type TForwardEvents = { forwarded: (value: string) => void }

		type TWideEvents = {
			closable: (value: boolean | undefined) => void
			size: (value: number) => void
		}

		type TNarrowEvents = {
			destroy: () => void
			closable: (value: boolean) => void
			size: (value: number) => void
		}

		it('имени из правила нет в карте — ошибка типов', () => {
			const source = new TEvented<TestEvents>()
			const target = new TEvented<TForwardEvents>()
			const other = new TEvented<{ other: () => void }>()
			const same = new TEvented<TestEvents>()

			// @ts-expect-error — строкового правила `change` нет в карте цели
			target.relay(source, ['change'])
			// @ts-expect-error — строкового правила `change` нет в карте источника
			same.relay(other, ['change'])
			// @ts-expect-error — `as` называет событие, которого нет в цели
			target.relay(source, [{ from: 'change', as: 'missing' }])
			// @ts-expect-error — у правила без `as` поле `from` не объявлено в цели
			target.relay(source, [{ from: 'change' }])
		})

		it('несовместимые обработчики — ошибка типов', () => {
			const source = new TEvented<{ id: (id: number) => void }>()
			const target = new TEvented<TForwardEvents>()

			// @ts-expect-error — `(id: number)` и `(value: string)` несовместимы в обе стороны
			target.relay(source, [{ from: 'id', as: 'forwarded' }])
		})

		it('несколько событий, не покрывающих карту цели: аргумент шире цели — ошибка типов', () => {
			const source = new TEvented<TWideEvents>()
			const target = new TEvented<TNarrowEvents>()

			// @ts-expect-error — два события из трёх, у `closable` аргумент источника шире цели
			target.relay(source, ['closable', 'size'])
		})

		it('событие с аргументом пробрасывается в цель без параметров', () => {
			const source = new TEvented<TestEvents>()
			const target = new TEvented<{ ping: () => void }>()
			const handler = vi.fn()

			target.on('ping', handler)
			target.relay(source, [{ from: 'submit', as: 'ping' }])
			source.emit('submit', 42)

			expect(handler).toHaveBeenCalledTimes(1)
		})

		it('хук then без аннотации получает аргументы события from', () => {
			const source = new TEvented<TestEvents>()
			const target = new TEvented<TForwardEvents>()
			const received: string[] = []

			target.relay(source, [
				{
					from: 'change',
					as: 'forwarded',
					then: (value) => {
						received.push(value.toUpperCase())
					},
				},
			])
			source.emit('change', 'hello')

			expect(received).toEqual(['HELLO'])
		})

		it('дженерик-карта цели сверяется по констрейнту', () => {
			const relayChange = <TEvents extends { change: (value: string) => void }>(
				target: TEvented<TEvents>,
				source: TEvented<TestEvents>,
			): void => {
				target.relay(source, ['change'])
				// @ts-expect-error — `submit` не объявлен в констрейнте карты цели
				target.relay(source, ['submit'])
			}
			const source = new TEvented<TestEvents>()
			const target = new TEvented<{ change: (value: string) => void; extra: () => void }>()
			const handler = vi.fn()

			target.on('change', handler)
			relayChange(target, source)
			source.emit('change', 'hello')

			expect(handler).toHaveBeenCalledWith('hello')
		})
	})

	// --- destroy ---

	it('destroy: отписывает relay-подписки от источника', () => {
		const source = new TEvented<TestEvents>()
		const target = new TEvented<{ forwarded: (value: string) => void }>()
		const emitSpy = vi.spyOn(target, 'emit')

		target.relay(source, [{ from: 'change', as: 'forwarded' }])
		target.destroy()
		emitSpy.mockClear()

		source.emit('change', 'hello')

		expect(emitSpy).not.toHaveBeenCalled()
	})

	it('destroy: удаляет входящие подписки', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.destroy()
		events.emit('change', 'hello')

		expect(handler).not.toHaveBeenCalled()
	})

	it('destroy: снимает middleware', () => {
		const events = new TEvented<TestEvents>()
		const middleware = vi.fn()

		events.use(middleware)
		events.destroy()
		events.emit('change', 'x')

		expect(middleware).not.toHaveBeenCalled()
	})
})
