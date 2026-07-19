/**
 * @soldy/setup — тесты моделей
 */
import { describe, it, expect } from 'vitest'
import { componentModel } from '../core/models/component'
import { componentViewModel } from '../core/models/component-view'

describe('componentModel', () => {
	it('содержит props от TComponent', () => {
		expect(componentModel.props.map(p => p.name)).toEqual([
			'rendered',
			'visible',
			'present',
		])
	})

	it('state — mutable: true, computed — mutable: false', () => {
		expect(componentModel.props[0].mutable).toBe(true)  // rendered
		expect(componentModel.props[1].mutable).toBe(true)  // visible
		expect(componentModel.props[2].mutable).toBe(false) // present
	})

	it('содержит события TComponent', () => {
		expect(componentModel.events).toContain('show')
		expect(componentModel.events).toContain('hide')
		expect(componentModel.events).toContain('created')
	})
})

describe('componentViewModel', () => {
	it('содержит props от TComponent + TComponentView', () => {
		const names = componentViewModel.props.map(p => p.name)
		expect(names).toContain('rendered')
		expect(names).toContain('tag')
		expect(names).toContain('classes')
	})

	it('содержит props от плагинов', () => {
		const names = componentViewModel.props.map(p => p.name)
		expect(names).toContain('element')
		expect(names).toContain('instance')
	})

	it('содержит событие ready из ComponentViewContribution', () => {
		expect(componentViewModel.events).toContain('ready')
	})

	it('все пропы имеют ownerId', () => {
		for (const p of componentViewModel.props) {
			expect(p.ownerId).toBeDefined()
			expect(typeof p.ownerId).toBe('symbol')
		}
	})

	it('triggers проброшены от контрибуций', () => {
		const rendered = componentViewModel.props.find(p => p.name === 'rendered')!
		expect(rendered.triggers).toEqual(['change:rendered'])
	})
})
