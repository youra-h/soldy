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
		emitter.on('test', second)
		emitter.off('test', first)

		expect(Reflect.get(emitter, '_items').size).toBe(1)

		emitter.off('test', second)

		expect(Reflect.get(emitter, '_items').size).toBe(0)
		expect(emitter.size).toBe(0)
	})

	it('обработчик, снявший себя посреди эмита, не мешает остальным', () => {
		const emitter = new TEventEmitter()
		const second = vi.fn()
		const first = vi.fn(() => emitter.off('test', first))

		emitter.on('test', first)
		emitter.on('test', second)
		emitter.emit('test')
		emitter.emit('test')

		expect(first).toHaveBeenCalledTimes(1)
		expect(second).toHaveBeenCalledTimes(2)
	})
})
