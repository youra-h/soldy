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

	it('hasHandlers: есть ли обработчик на любом событии', () => {
		const emitter = new TEventEmitter()
		const first = vi.fn()
		const second = vi.fn()

		expect(emitter.hasHandlers()).toBe(false)

		emitter.on('test1', first)
		emitter.on('test2', second)
		emitter.off('test1', first)

		expect(emitter.hasHandlers()).toBe(true)

		// Набор события, с которого сняли последний обработчик, остаётся пустым
		emitter.off('test2', second)

		expect(emitter.hasHandlers()).toBe(false)

		emitter.on('test1', first)
		emitter.remove()

		expect(emitter.hasHandlers()).toBe(false)
	})
})
