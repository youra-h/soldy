import { describe, it, expect, vi, afterEach } from 'vitest'
import { TComponent } from '@soldy/core'
import { sync } from './../sync'
import { componentSchema } from './../components'
import type { ISyncBinding, TEmit, TEmitProperty } from './../types'

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

		// change:rendered → rendered + present (property)
		// change:present → event
		const emits = fn.mock.calls.map((c: any) => c[0]) as TEmit[]
		const renderedEmit = emits.find(
			(e): e is TEmitProperty<any> => e.type === 'property' && e.name === 'rendered',
		)
		expect(renderedEmit).toBeDefined()
		expect(renderedEmit!.value).toBe(false)
	})

	it('эмитит property при изменении visible', () => {
		const component = new TComponent({ visible: true })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.visible = false

		// hide:before → change:visible → visible+present → change:present → hide:after
		const emits = fn.mock.calls.map((c: any) => c[0]) as TEmit[]
		const visibleEmit = emits.find(
			(e): e is TEmitProperty<any> => e.type === 'property' && e.name === 'visible',
		)
		expect(visibleEmit).toBeDefined()
		expect(visibleEmit!.value).toBe(false)
	})

	it('эмитит readonly present при изменении rendered', () => {
		const component = new TComponent({ rendered: true, visible: true })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.rendered = false

		const emits = fn.mock.calls.map((c: any) => c[0]) as TEmit[]
		const presentEmit = emits.find(
			(e): e is TEmitProperty<any> => e.type === 'property' && e.name === 'present',
		)
		expect(presentEmit).toBeDefined()
		expect(presentEmit!.value).toBe(false)
	})

	it('эмитит readonly present при изменении visible', () => {
		const component = new TComponent({ rendered: true, visible: true })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.visible = false

		const emits = fn.mock.calls.map((c: any) => c[0]) as TEmit[]
		const presentEmit = emits.find(
			(e): e is TEmitProperty<any> => e.type === 'property' && e.name === 'present',
		)
		expect(presentEmit).toBeDefined()
		expect(presentEmit!.value).toBe(false)
	})

	// ── Event emits ────────────────────────────────────────

	it('show:before и show:after эмитятся при show()', () => {
		const component = new TComponent({ rendered: true, visible: false })
		binding = sync(componentSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.show()

		const emitNames = fn.mock.calls.map((c: any) => c[0].name)
		expect(emitNames).toContain('show:before')
		expect(emitNames).toContain('show')
		expect(emitNames).toContain('show:after')
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

	it('уведомляет всех подписчиков одинаковое количество раз', () => {
		const component = new TComponent({ rendered: true })
		binding = sync(componentSchema, component)

		const fn1 = vi.fn()
		const fn2 = vi.fn()
		const fn3 = vi.fn()

		binding.subscribe(fn1)
		binding.subscribe(fn2)
		binding.subscribe(fn3)

		component.rendered = false

		// Все получают одинаковое количество вызовов
		expect(fn1.mock.calls.length).toBeGreaterThan(0)
		expect(fn1.mock.calls.length).toBe(fn2.mock.calls.length)
		expect(fn2.mock.calls.length).toBe(fn3.mock.calls.length)
	})
})
