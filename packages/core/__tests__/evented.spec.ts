import { describe, it, expect, vi } from 'vitest'
import { TEvented } from '@soldy-ui/core'

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
			// Проброс подключён, пока цель слушают
			target.on('forwarded', () => {})
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

/**
 * Семантика эмита, которую ленивые структуры шины не вправе поменять: она
 * была до них, и тесты ниже проходили и на шине, которая заводила эмиттер,
 * карту и пробросы в конструкторе.
 */
describe('TEvented: семантика эмита', () => {
	it('обработчики вызываются в порядке подписки', () => {
		const events = new TEvented<TestEvents>()
		const order: string[] = []

		events.on('change', () => order.push('a'))
		events.on('change', () => order.push('b'))
		events.on('change', () => order.push('c'))
		events.emit('change', 'x')

		expect(order).toEqual(['a', 'b', 'c'])
	})

	it('повторная подписка того же обработчика — одна подписка', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.on('change', handler)
		events.emit('change', 'x')

		expect(handler).toHaveBeenCalledTimes(1)

		events.off('change', handler)
		events.emit('change', 'y')

		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('обработчик, снятый посреди эмита, в этом эмите уже не вызывается', () => {
		const events = new TEvented<TestEvents>()
		const second = vi.fn()

		events.on('change', () => events.off('change', second))
		events.on('change', second)
		events.emit('change', 'x')

		expect(second).not.toHaveBeenCalled()
	})

	it('обработчик того же события, поставленный посреди эмита, вызывается в нём же', () => {
		const events = new TEvented<TestEvents>()
		const late = vi.fn()

		events.on('change', () => events.on('change', late))
		events.emit('change', 'x')

		expect(late).toHaveBeenCalledWith('x')
	})

	it('перехватчик — раньше обработчиков события', () => {
		const events = new TEvented<TestEvents>()
		const order: string[] = []

		events.on('change', () => order.push('on'))
		events.use(() => order.push('use'))
		events.emit('change', 'x')

		expect(order).toEqual(['use', 'on'])
	})
})

/**
 * Поля шины, которые держат объект: эмиттер, перехватчики, слушатели, пробросы.
 * Счётчик глушения — число, структурой он не считается.
 */
function structuresOf(bus: object): string[] {
	return Object.entries(bus)
		.filter(([, value]) => typeof value === 'object' && value !== null)
		.map(([key]) => key)
}

/**
 * Шина платит за подписку, а не за то, что создана: шин много — у каждого
 * экземпляра ядра, плагина и расширения, — а слушают большинство из них только
 * пока компонент смонтирован. Раньше каждая шина заводила эмиттер, карту и
 * пробросы в конструкторе, и строка таблицы держала их по 34 штуки.
 */
describe('TEvented: структуры — с первой подпиской', () => {
	it('у шины без подписчиков структур нет', () => {
		expect(structuresOf(new TEvented<TestEvents>())).toEqual([])
	})

	it('последняя отписка снимает всё, что завела первая подписка', () => {
		const events = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.on('change', handler)
		events.on('reset', handler)

		expect(structuresOf(events)).not.toEqual([])

		events.off('change', handler)
		events.off('reset', handler)

		expect(structuresOf(events)).toEqual([])

		events.use(vi.fn())()
		events.listen(vi.fn())()

		expect(structuresOf(events)).toEqual([])
	})

	it('после destroy структур нет, и шина работает дальше', () => {
		const events = new TEvented<TestEvents>()
		const source = new TEvented<TestEvents>()
		const handler = vi.fn()

		events.relayAll(source)
		events.on('change', vi.fn())
		events.use(vi.fn())
		events.listen(vi.fn())
		events.destroy()

		expect(structuresOf(events)).toEqual([])
		expect(structuresOf(source)).toEqual([])

		events.on('change', handler)
		events.emit('change', 'после')

		expect(handler).toHaveBeenCalledWith('после')
	})
})

/**
 * Слушатель всех событий — подписчик, которому шина отдаёт событие последним:
 * после обработчиков `on` этого события. Так подписчик ядра, пришедший после
 * обмена адаптера, слышит событие раньше фреймворка, а обмену хватает одного
 * слушателя на шину вместо подписки на каждое событие.
 */
describe('TEvented: listen', () => {
	it('получает имя и аргументы каждого эмита', () => {
		const events = new TEvented<TestEvents>()
		const listener = vi.fn()

		events.listen(listener)
		events.emit('change', 'a')
		events.emit('submit', 7)
		events.emit('reset')

		expect(listener.mock.calls).toEqual([
			['change', ['a']],
			['submit', [7]],
			['reset', []],
		])
	})

	it('после обработчиков on — и тех, что подписались позже', () => {
		const events = new TEvented<TestEvents>()
		const order: string[] = []

		events.listen(() => order.push('listen'))
		events.on('change', () => order.push('on'))
		events.use(() => order.push('use'))
		events.emit('change', 'x')

		expect(order).toEqual(['use', 'on', 'listen'])
	})

	it('правило — в пределах одной шины: событие relayAll слушатель цели получает раньше обработчиков источника', () => {
		// Проброс relayAll висит на перехватчике источника, а перехватчик — раньше обработчиков
		const source = new TEvented<TestEvents>()
		const target = new TEvented<TestEvents>()
		const order: string[] = []

		target.relayAll(source)
		target.listen(() => order.push('слушатель цели'))
		source.on('change', () => order.push('обработчик источника'))
		source.emit('change', 'x')

		expect(order).toEqual(['слушатель цели', 'обработчик источника'])
	})

	it('слушатели — в порядке подписки', () => {
		const events = new TEvented<TestEvents>()
		const order: string[] = []

		events.listen(() => order.push('first'))
		events.listen(() => order.push('second'))
		events.emit('reset')

		expect(order).toEqual(['first', 'second'])
	})

	it('заглушённый эмит слушателя не вызывает', () => {
		const events = new TEvented<TestEvents>()
		const listener = vi.fn()

		events.listen(listener)
		events.silent(() => events.emit('change', 'тихо'))

		expect(listener).not.toHaveBeenCalled()
	})

	it('снимается своей отпиской и destroy', () => {
		const events = new TEvented<TestEvents>()
		const first = vi.fn()
		const second = vi.fn()

		events.listen(first)()
		events.listen(second)
		events.emit('reset')
		events.destroy()
		events.emit('reset')

		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledTimes(1)
	})

	it('снятый посреди эмита этот эмит не получает, поставленный — получает следующий', () => {
		const events = new TEvented<TestEvents>()
		const removed = vi.fn()
		const late = vi.fn()
		let release = (): void => {}
		let first = true

		events.listen(() => {
			if (!first) return

			first = false
			release()
			events.listen(late)
		})
		release = events.listen(removed)
		events.emit('change', 'первый')

		expect(removed).not.toHaveBeenCalled()
		expect(late).not.toHaveBeenCalled()

		events.emit('change', 'второй')

		expect(late.mock.calls).toEqual([['change', ['второй']]])
	})
})

/**
 * Проброс держит источник, только пока цель слушают: первый подписчик цели
 * подписывает её на источник, ушедший последний — отписывает. Так цель, которая
 * живёт меньше источника (фасад коллекции над движком снаружи), не остаётся на
 * нём: она уходит вместе со своими подписчиками, а снимать проброс некому не
 * нужно.
 */
describe('TEvented: проброс держит источник, пока цель слушают', () => {
	/** Сколько подписок держит шина: `on` без `off`, перехватчики `use` и слушатели `listen`. */
	function heldBy(bus: TEvented<TestEvents>): () => number {
		let count = 0
		const on = bus.on.bind(bus)
		const off = bus.off.bind(bus)
		const use = bus.use.bind(bus)
		const listen = bus.listen.bind(bus)

		vi.spyOn(bus, 'on').mockImplementation((event, handler) => {
			count++
			on(event, handler)
		})
		vi.spyOn(bus, 'off').mockImplementation((event, handler) => {
			count--
			off(event, handler)
		})
		vi.spyOn(bus, 'use').mockImplementation((middleware) => {
			const release = use(middleware)

			count++

			return () => {
				count--
				release()
			}
		})
		vi.spyOn(bus, 'listen').mockImplementation((listener) => {
			const release = listen(listener)

			count++

			return () => {
				count--
				release()
			}
		})

		return () => count
	}

	it('слушатель цели — тоже подписчик: relay и relayAll подключаются с ним', () => {
		const source = new TEvented<TestEvents>()
		const target = new TEvented<TestEvents>()
		const other = new TEvented<TestEvents>()
		const held = heldBy(source)
		const listener = vi.fn()

		target.relay(source, ['change'])
		other.relayAll(source)

		const release = target.listen(listener)
		const releaseOther = other.listen(vi.fn())

		expect(held()).toBe(2)

		source.emit('change', 'x')

		expect(listener).toHaveBeenCalledWith('change', ['x'])

		release()
		releaseOther()

		expect(held()).toBe(0)
	})

	it('relay: подписка на источник — с первым подписчиком цели, отписка — с последним', () => {
		const source = new TEvented<TestEvents>()
		const target = new TEvented<TestEvents>()
		const held = heldBy(source)
		const onChange = vi.fn()
		const onReset = vi.fn()

		target.relay(source, ['change', 'reset'])

		expect(held()).toBe(0)

		target.on('change', onChange)
		target.on('reset', onReset)

		expect(held()).toBe(2)

		target.off('change', onChange)

		expect(held()).toBe(2)

		target.off('reset', onReset)

		expect(held()).toBe(0)
	})

	it('relayAll: перехватчик на источнике стоит, пока цель слушают', () => {
		const source = new TEvented<TestEvents>()
		const target = new TEvented<TestEvents>()
		const held = heldBy(source)
		const handler = vi.fn()

		target.relayAll(source)

		expect(held()).toBe(0)

		target.on('submit', handler)
		source.emit('submit', 7)

		expect(held()).toBe(1)
		expect(handler).toHaveBeenCalledWith(7)

		target.off('submit', handler)

		expect(held()).toBe(0)
	})

	it('перехватчик цели — тоже подписчик', () => {
		const source = new TEvented<TestEvents>()
		const target = new TEvented<TestEvents>()
		const held = heldBy(source)

		target.relayAll(source)

		const release = target.use(vi.fn())

		expect(held()).toBe(1)

		release()

		expect(held()).toBe(0)
	})

	it('цепочка подключается от подписчика последнего звена и отключается с ним', () => {
		const source = new TEvented<TestEvents>()
		const middle = new TEvented<TestEvents>()
		const outer = new TEvented<TestEvents>()
		const held = heldBy(source)
		const handler = vi.fn()

		middle.relayAll(source)
		outer.relay(middle, ['change'])

		expect(held()).toBe(0)

		outer.on('change', handler)
		source.emit('change', 'x')

		expect(held()).toBe(1)
		expect(handler).toHaveBeenCalledWith('x')

		outer.off('change', handler)

		expect(held()).toBe(0)
	})

	it('проброс, заведённый у цели, которую уже слушают, подключается сразу', () => {
		const source = new TEvented<TestEvents>()
		const target = new TEvented<TestEvents>()
		const held = heldBy(source)
		const handler = vi.fn()

		target.on('change', handler)
		target.relay(source, ['change'])
		source.emit('change', 'y')

		expect(held()).toBe(1)
		expect(handler).toHaveBeenCalledWith('y')
	})

	it('destroy цели снимает подключённые пробросы', () => {
		const source = new TEvented<TestEvents>()
		const target = new TEvented<TestEvents>()
		const held = heldBy(source)

		target.relayAll(source)
		target.on('change', vi.fn())

		expect(held()).toBe(1)

		target.destroy()

		expect(held()).toBe(0)
	})
})
