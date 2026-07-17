/**
 * @soldy/host — тесты Runtime
 */
import { describe, it, expect } from 'vitest'
import { compileComponent } from '../compiler/compileComponent'
import { ComponentContribution } from '../contributions/component.contribution'
import { Runtime } from '../runtime/Runtime'
import { ComponentAccessorProvider } from '../providers/componentAccessorProvider'
import { AggregateAccessorProvider } from '../runtime/aggregateProvider'
import { TComponent } from '@soldy/core'

describe('Runtime', () => {
	it('собирает модель из Contribution', () => {
		const model = compileComponent([ComponentContribution])

		expect(model.members).toHaveLength(3)
		expect(model.members.map(m => m.name)).toEqual([
			'rendered',
			'visible',
			'present',
		])
		expect(model.members.map(m => m.mutable)).toEqual([
			true,
			true,
			false,
		])
		expect(model.events).toContain('show')
		expect(model.events).toContain('hide')
		expect(model.events).toContain('change:rendered')
	})

	it('Runtime получает значение свойства из компонента', () => {
		const model = compileComponent([ComponentContribution])
		const component = new TComponent()

		const provider = new AggregateAccessorProvider()
		provider.addProvider(new ComponentAccessorProvider(component))

		const runtime = new Runtime(model, provider)

		expect(runtime.getValue('rendered')).toBe(true)
		expect(runtime.getValue('visible')).toBe(true)
		expect(runtime.getValue('present')).toBe(true)
		runtime.dispose()
	})

	it('Runtime уведомляет о изменениях', () => {
		const model = compileComponent([ComponentContribution])
		const component = new TComponent()
		const provider = new AggregateAccessorProvider()
		provider.addProvider(new ComponentAccessorProvider(component))

		const runtime = new Runtime(model, provider)

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

	it('Runtime.setValue обновляет свойство компонента', () => {
		const model = compileComponent([ComponentContribution])
		const component = new TComponent()
		const provider = new AggregateAccessorProvider()
		provider.addProvider(new ComponentAccessorProvider(component))

		const runtime = new Runtime(model, provider)

		const result = runtime.setValue('rendered', false)
		expect(result).toBe(true)
		expect(component.rendered).toBe(false)

		runtime.dispose()
	})
})
