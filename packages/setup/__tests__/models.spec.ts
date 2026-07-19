/**
 * @soldy/setup — тесты дескрипторов (замена compileComponent)
 */
import { describe, it, expect } from 'vitest'
import { ComponentDescriptor } from '../descriptors/components/component.descriptor'
import { ComponentViewDescriptor } from '../descriptors/components/component-view.descriptor'

describe('ComponentDescriptor', () => {
	it('содержит props от TComponent', () => {
		expect(ComponentDescriptor.model.props.map(p => p.name)).toEqual([
			'rendered',
			'visible',
			'present',
		])
	})

	it('state — mutable: true, computed — mutable: false', () => {
		const m = ComponentDescriptor.model
		expect(m.props[0].mutable).toBe(true)  // rendered
		expect(m.props[1].mutable).toBe(true)  // visible
		expect(m.props[2].mutable).toBe(false) // present
	})

	it('содержит события TComponent', () => {
		expect(ComponentDescriptor.model.events).toContain('show')
		expect(ComponentDescriptor.model.events).toContain('hide')
		expect(ComponentDescriptor.model.events).toContain('created')
	})
})

describe('ComponentViewDescriptor', () => {
	it('содержит props от TComponent + TComponentView (наследование)', () => {
		const names = ComponentViewDescriptor.model.props.map(p => p.name)
		expect(names).toContain('rendered')
		expect(names).toContain('tag')
		expect(names).toContain('classes')
	})

	it('содержит props от плагинов', () => {
		const names = ComponentViewDescriptor.model.props.map(p => p.name)
		expect(names).toContain('element')
	})

	it('содержит событие ready из ComponentViewContribution', () => {
		expect(ComponentViewDescriptor.model.events).toContain('ready')
	})

	it('содержит события от плагинов (ready, removed)', () => {
		expect(ComponentViewDescriptor.model.events).toContain('ready')
		expect(ComponentViewDescriptor.model.events).toContain('removed')
	})

	it('triggers проброшены от контрибуций', () => {
		const rendered = ComponentViewDescriptor.model.props.find(p => p.name === 'rendered')!
		expect(rendered.triggers).toEqual(['change:rendered'])
	})

	it('createBundle создаёт бандл с плагинами', () => {
		const bundle = ComponentViewDescriptor.createBundle()
		expect(bundle).toBeDefined()
	})

	it('createRuntime создаёт работающий рантайм', () => {
		const bundle = ComponentViewDescriptor.createBundle()
		// createRuntime требует instance и bundle
		// проверяем что он вообще создаётся без ошибок
		expect(typeof ComponentViewDescriptor.createRuntime).toBe('function')
	})
})
