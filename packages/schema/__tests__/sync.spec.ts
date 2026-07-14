import { describe, it, expect, vi, afterEach } from 'vitest'
import { TComponent } from '@soldy/core'
import { sync } from './../sync'
import { componentSchema } from './../components'
import type { ISyncBinding, TEmit } from './../types'

describe('sync + componentSchema', () => {
	let binding: ISyncBinding<any, any>

	afterEach(() => {
		binding?.dispose()
	})

	// ── subscribe / dispose ────────────────────────────────

	it('subscribe возвращает функцию отписки', () => {
		const component = new TComponent({ rendered: true })
		binding = sync(componentSchema, component)

		const unsubscribe = binding.subscribe(() => {})
		expect(unsubscribe).toBeTypeOf('function')
	})

	it('dispose очищает подписчиков', () => {
		const component = new TComponent({ rendered: true })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)
		binding.dispose()

		// После dispose подписчик уже не должен вызываться
		component.rendered = false
		expect(fn).not.toHaveBeenCalled()
	})

	it('отписка одного подписчика не затрагивает других', () => {
		const component = new TComponent({ rendered: true })
		binding = sync(componentSchema, component)

		const fn1 = vi.fn()
		const fn2 = vi.fn()
		const unsub = binding.subscribe(fn1)
		binding.subscribe(fn2)

		unsub()

		component.rendered = false

		expect(fn1).not.toHaveBeenCalled()
		expect(fn2).toHaveBeenCalled()
	})

	// ── Property emits ─────────────────────────────────────

	it('эмитит property при изменении rendered', () => {
		const component = new TComponent({ rendered: true })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.rendered = false

		expect(fn).toHaveBeenCalledTimes(1)

		const emit = fn.mock.calls[0]![0] as TEmit
		expect(emit.type).toBe('property')
		expect(emit.name).toBe('rendered')
		expect(emit.value).toBe(false)
	})

	it('эмитит property при изменении visible', () => {
		const component = new TComponent({ visible: true })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.visible = false

		expect(fn).toHaveBeenCalledTimes(1)

		const emit = fn.mock.calls[0]![0] as TEmit
		expect(emit.type).toBe('property')
		expect(emit.name).toBe('visible')
		expect(emit.value).toBe(false)
	})

	it('эмитит computed present при изменении rendered', () => {
		const component = new TComponent({ rendered: true, visible: true })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.rendered = false

		const emits = fn.mock.calls.map((c: any) => c[0])
		const presentEmit = emits.find((e: TEmit) => e.name === 'present')
		expect(presentEmit).toBeDefined()
		expect(presentEmit!.value).toBe(false)
	})

	it('эмитит computed present при изменении visible', () => {
		const component = new TComponent({ rendered: true, visible: true })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.visible = false

		const emits = fn.mock.calls.map((c: any) => c[0])
		const presentEmit = emits.find((e: TEmit) => e.name === 'present')
		expect(presentEmit).toBeDefined()
		expect(presentEmit!.value).toBe(false)
	})

	// ── Event emits ────────────────────────────────────────

	it('эмитит show как событие', () => {
		const component = new TComponent({ rendered: true })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.show()

		const emit = fn.mock.calls[0]![0] as TEmit
		expect(emit.type).toBe('event')
		expect(emit.name).toBe('show')
	})

	it('эмитит hide:after как событие', () => {
		const component = new TComponent({ rendered: true, visible: true })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.hide()

		const emitNames = fn.mock.calls.map((c: any) => c[0].name)
		expect(emitNames).toContain('hide:after')
	})

	// ── Множественные подписчики ──────────────────────────

	it('уведомляет всех подписчиков', () => {
		const component = new TComponent({ rendered: true })
		binding = sync(componentSchema, component)

		const fn1 = vi.fn()
		const fn2 = vi.fn()
		const fn3 = vi.fn()

		binding.subscribe(fn1)
		binding.subscribe(fn2)
		binding.subscribe(fn3)

		component.rendered = false

		expect(fn1).toHaveBeenCalledTimes(1)
		expect(fn2).toHaveBeenCalledTimes(1)
		expect(fn3).toHaveBeenCalledTimes(1)
	})
})
