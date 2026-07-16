import { describe, it, expect, vi, afterEach } from 'vitest'
import { TComponentView } from '@soldy/core'
import { sync } from './../sync'
import { componentViewSchema } from './../components'
import type { ISyncBinding, TEmit, TEmitProperty } from './../types'

describe('sync + componentViewSchema', () => {
	let binding: ISyncBinding<any, any>

	afterEach(() => {
		binding?.dispose()
	})

	// ── Наследованные свойства ────────────────────────────

	it('эмитит inherited property rendered', () => {
		const component = new TComponentView({ rendered: true })
		binding = sync(componentViewSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.rendered = false

		const emits = fn.mock.calls.map((c: any) => c[0]) as TEmit[]
		const renderedEmit = emits.find(
			(e): e is TEmitProperty<any> => e.type === 'property' && e.name === 'rendered',
		)
		expect(renderedEmit).toBeDefined()
		expect(renderedEmit!.value).toBe(false)
	})

	it('эмитит inherited readonly present', () => {
		const component = new TComponentView({ rendered: true, visible: true })
		binding = sync(componentViewSchema, component)

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

	// ── Собственные свойства ──────────────────────────────

	it('эмитит tag при изменении', () => {
		const component = new TComponentView({ tag: 'div' })
		binding = sync(componentViewSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.tag = 'span'

		const emits = fn.mock.calls.map((c: any) => c[0]) as TEmit[]
		const emit = emits[0]!
		expect(emit.type).toBe('property')
		expect(emit.name).toBe('tag')
		expect((emit as TEmitProperty<any>).value).toBe('span')
	})

	it('эмитит readonly classes при изменении', () => {
		const component = new TComponentView({ tag: 'div' })
		binding = sync(componentViewSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.classes.add('foo')

		const emits = fn.mock.calls.map((c: any) => c[0])
		const classesEmit = emits.find((e: TEmit) => e.name === 'classes')
		expect(classesEmit).toBeDefined()
	})

	// ── Собственные события ───────────────────────────────

	it('эмитит ready как событие', () => {
		const component = new TComponentView({ tag: 'div' })
		binding = sync(componentViewSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.ready = true

		const emits = fn.mock.calls.map((c: any) => c[0])
		const readyEmit = emits.find((e: TEmit) => e.name === 'ready')
		expect(readyEmit).toBeDefined()
		expect(readyEmit!.type).toBe('event')
	})

	// ── Наследованные события ─────────────────────────────

	it('show:before и show:after эмитятся при show()', () => {
		const component = new TComponentView({ tag: 'div', rendered: true, visible: false })
		binding = sync(componentViewSchema, component)

		const fn = vi.fn()
		binding.subscribe(fn)

		component.show()

		const emitNames = fn.mock.calls.map((c: any) => c[0].name)
		expect(emitNames).toContain('show:before')
		expect(emitNames).toContain('show')
		expect(emitNames).toContain('show:after')
	})
})
