/**
 * @soldy/host — тесты TRuntime
 */
import { describe, it, expect } from 'vitest'
import { compileComponent } from '../compiler/compileComponent'
import { ComponentContribution } from '../contributions/component.contribution'
import { TRuntime } from '../runtime/Runtime'
import { TComponentAccessorProvider } from '../providers/componentAccessorProvider'
import { TAggregateEventProvider } from '../runtime/aggregateProvider'
import { TComponent } from '@soldy/core'

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

	it('TRuntime получает значение свойства из компонента', () => {
		const model = compileComponent([ComponentContribution])
		const component = new TComponent()

		const provider = new TAggregateEventProvider()
		provider.addProvider(new TComponentAccessorProvider(component))

		const runtime = new TRuntime(model, provider)

		expect(runtime.getValue('rendered')).toBe(true)
		expect(runtime.getValue('visible')).toBe(true)
		expect(runtime.getValue('present')).toBe(true)
		runtime.dispose()
	})

	it('TRuntime уведомляет о изменениях', () => {
		const model = compileComponent([ComponentContribution])
		const component = new TComponent()
		const provider = new TAggregateEventProvider()
		provider.addProvider(new TComponentAccessorProvider(component))

		const runtime = new TRuntime(model, provider)

		const changes: any[] = []
		runtime.subscribe((payload) => {
			changes.push(payload)
		})

		component.rendered = false

		expect(changes.length).toBeGreaterThanOrEqual(1)
		const change = changes.find((c: any) => c.name === 'rendered')
		expect(change).toBeDefined()
		expect(change!.value).toBe(false)

		runtime.dispose()
	})

	it('TRuntime.setValue обновляет свойство компонента', () => {
		const model = compileComponent([ComponentContribution])
		const component = new TComponent()
		const provider = new TAggregateEventProvider()
		provider.addProvider(new TComponentAccessorProvider(component))

		const runtime = new TRuntime(model, provider)

		const result = runtime.setValue('rendered', false)
		expect(result).toBe(true)
		expect(component.rendered).toBe(false)

		runtime.dispose()
	})
})
