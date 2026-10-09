import { describe, it, expect, vi } from 'vitest'
import { TEventEmitter } from '@soldy-ui/core'

describe('TEventEmitter', () => {
	it('on/emit: подписка и вызов события', () => {
		const emitter = new TEventEmitter()
		const handler = vi.fn()
		emitter.on('test', handler)
		emitter.emit('test', 1, 2)
		expect(handler).toHaveBeenCalledWith(1, 2)
	})

	it('off: отписка от события', () => {
		const emitter = new TEventEmitter()
		const handler = vi.fn()
		emitter.on('test', handler)
		emitter.off('test', handler)
		emitter.emit('test')
		expect(handler).not.toHaveBeenCalled()
	})

	it('remove: удаляет все события', () => {
		const emitter = new TEventEmitter()
		const handler = vi.fn()
		emitter.on('test', handler)
		emitter.remove()
		emitter.emit('test')
		expect(handler).not.toHaveBeenCalled()
	})

	it('remove: удаляет только указанное событие', () => {
		const emitter = new TEventEmitter()
		const handler1 = vi.fn()
		const handler2 = vi.fn()
		emitter.on('test1', handler1)
		emitter.on('test2', handler2)
		emitter.remove('test1')
		emitter.emit('test1')
		emitter.emit('test2')
		expect(handler1).not.toHaveBeenCalled()
		expect(handler2).toHaveBeenCalled()
	})

	/**
	 * Эмиттер живёт дольше подписчиков — строка таблицы дольше своих
	 * монтирований, — и пустой набор на каждое событие, которое когда-нибудь
	 * слушали, оставался бы в памяти навсегда. Наблюдать это снаружи нечем,
	 * поэтому тест смотрит в карту наборов.
	 */
	it('off последнего обработчика снимает и набор события', () => {
		const emitter = new TEventEmitter()
		const first = vi.fn()
		const second = vi.fn()

		emitter.on('test', first)
		emitter.on('other', second)
		emitter.off('test', first)

		expect(Reflect.get(emitter, '_items').size).toBe(1)

		emitter.off('other', second)

		expect(emitter.size).toBe(0)
	})

	/**
	 * Эмиттер платит за подписку, а не за то, что создан: карта наборов
	 * заводится с первой подпиской и уходит с последней отпиской. Наблюдать это
	 * снаружи нечем, поэтому тест смотрит в поле карты.
	 */
	it('без подписок карты наборов нет — ни до первой, ни после последней', () => {
		const emitter = new TEventEmitter()
		const handler = vi.fn()

		expect(Reflect.get(emitter, '_items')).toBeUndefined()

		emitter.on('test', handler)
		emitter.off('test', handler)

		expect(Reflect.get(emitter, '_items')).toBeUndefined()

		emitter.on('test', handler)
		emitter.remove('test')

		expect(Reflect.get(emitter, '_items')).toBeUndefined()
		expect(emitter.size).toBe(0)
	})
})

/**
 * Семантика эмита, которую ленивые структуры не вправе поменять: она была до
 * них, и тесты ниже проходили и на эмиттере, который заводил карту сразу.
 */
describe('TEventEmitter: семантика эмита', () => {
	it('обработчики вызываются в порядке подписки', () => {
		const emitter = new TEventEmitter()
		const order: string[] = []

		emitter.on('test', () => order.push('a'))
		emitter.on('test', () => order.push('b'))
		emitter.on('test', () => order.push('c'))
		emitter.emit('test')

		expect(order).toEqual(['a', 'b', 'c'])
	})

	it('повторная подписка того же обработчика — одна подписка', () => {
		const emitter = new TEventEmitter()
		const handler = vi.fn()

		emitter.on('test', handler)
		emitter.on('test', handler)
		emitter.emit('test')

		expect(handler).toHaveBeenCalledTimes(1)
		expect(emitter.size).toBe(1)

		emitter.off('test', handler)
		emitter.emit('test')

		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('обработчик, снятый посреди эмита, в этом эмите уже не вызывается', () => {
		const emitter = new TEventEmitter()
		const second = vi.fn()

		emitter.on('test', () => emitter.off('test', second))
		emitter.on('test', second)
		emitter.emit('test')

		expect(second).not.toHaveBeenCalled()
	})

	it('обработчик того же события, поставленный посреди эмита, вызывается в нём же', () => {
		const emitter = new TEventEmitter()
		const late = vi.fn()

		emitter.on('test', () => emitter.on('test', late))
		emitter.emit('test')

		expect(late).toHaveBeenCalledTimes(1)
	})
})
