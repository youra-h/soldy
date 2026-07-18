/**
 * @soldy/provider — тесты TRuntime
 */
import { describe, it, expect, vi } from 'vitest'
import { compileComponent } from '../compiler/compileComponent'
import { ComponentContribution } from '@soldy/setup'
import { TObservingAccessorProvider } from '../runtime/accessor-provider.class'
import { TRuntime } from '../runtime/runtime.class'
import { TAggregateProvider } from '../runtime/aggregate-provider.class'
import type { IContribution } from '../contract/types'
import { TComponent } from '@soldy/core'

function makeRuntime(contributions: IContribution[] = [ComponentContribution]) {
	const model = compileComponent(contributions)
	const component = new TComponent()
	const provider = new TAggregateProvider()
	provider.add(new TObservingAccessorProvider(component))
	return { runtime: new TRuntime(model, provider), component }
}

describe('TRuntime', () => {
	it('собирает модель из IContribution', () => {
		const model = compileComponent([ComponentContribution])

		expect(model.props).toHaveLength(3)
		expect(model.props.map(m => m.name)).toEqual([
			'rendered',
			'visible',
			'present',
		])
		expect(model.props.map(m => m.mutable)).toEqual([
			true,
			true,
			false,
		])
		expect(model.events).toContain('show')
		expect(model.events).toContain('hide')
	})

	it('получает значение свойства из компонента', () => {
		const { runtime } = makeRuntime()

		expect(runtime.getValue('rendered')).toBe(true)
		expect(runtime.getValue('visible')).toBe(true)
		expect(runtime.getValue('present')).toBe(true)
		runtime.dispose()
	})

	it('getValue для неизвестного свойства возвращает undefined', () => {
		const { runtime } = makeRuntime()

		expect(runtime.getValue('nonexistent')).toBeUndefined()
		runtime.dispose()
	})

	it('уведомляет о изменениях', () => {
		const { runtime, component } = makeRuntime()

		const changes: any[] = []
		runtime.subscribe((payload) => {
			changes.push(payload)
		})

		component.rendered = false

		expect(changes.length).toBeGreaterThanOrEqual(1)
		const change = changes.find((c: any) => c.name === 'rendered')
		expect(change).toBeDefined()
		expect(change!.value).toBe(false)
		expect(change!.type).toBe('property')

		runtime.dispose()
	})

	it('setValue обновляет свойство компонента', () => {
		const { runtime, component } = makeRuntime()

		const result = runtime.setValue('rendered', false)
		expect(result).toBe(true)
		expect(component.rendered).toBe(false)

		runtime.dispose()
	})

	it('setValue для неизвестного свойства возвращает false', () => {
		const { runtime } = makeRuntime()

		expect(runtime.setValue('nonexistent', 42)).toBe(false)
		runtime.dispose()
	})

	it('setValue для non-mutable свойства возвращает false', () => {
		const { runtime, component } = makeRuntime()

		const result = runtime.setValue('present', false)
		expect(result).toBe(false)
		expect(component.present).toBe(true) // не изменилось

		runtime.dispose()
	})

	it('dispose отписывается от всех подписчиков', () => {
		const { runtime, component } = makeRuntime()

		const spy = vi.fn()
		runtime.subscribe(spy)
		runtime.dispose()

		component.rendered = false
		expect(spy).not.toHaveBeenCalled()
	})

	it('subscribe возвращает функцию отписки', () => {
		const { runtime, component } = makeRuntime()

		const spy = vi.fn()
		const unsub = runtime.subscribe(spy)
		unsub()

		component.rendered = false
		expect(spy).not.toHaveBeenCalled()

		runtime.dispose()
	})

	it('уведомляет о событиях из модели', () => {
		const testContribution: IContribution = {
			id: Symbol('test'),
			props: [],
			events: ['show'],
		}
		const { runtime, component } = makeRuntime([testContribution])

		const events: any[] = []
		runtime.subscribe((payload) => {
			if (payload.type === 'event') events.push(payload)
		})

		component.events.emit('show')

		expect(events.length).toBeGreaterThanOrEqual(1)
		expect(events[0].name).toBe('show')

		runtime.dispose()
	})
})
