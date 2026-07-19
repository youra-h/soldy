/**
 * @soldy/provider — тесты compileComponent
 */
import { describe, it, expect } from 'vitest'
import { compileComponent } from '../compiler/compileComponent'
import type { IContribution } from '../contract/types'

const idA = Symbol('a')
const idB = Symbol('b')

describe('compileComponent', () => {
	it('собирает props из одной контрибуции', () => {
		const c: IContribution = {
			id: idA,
			props: [{ name: 'x', kind: 'state' }],
			events: [],
		}
		const model = compileComponent([c])

		expect(model.props).toHaveLength(1)
		expect(model.props[0].name).toBe('x')
		expect(model.props[0].ownerId).toBe(idA)
	})

	it('state по умолчанию mutable: true', () => {
		const model = compileComponent([{
			id: idA,
			props: [{ name: 'x', kind: 'state' }],
			events: [],
		}])

		expect(model.props[0].mutable).toBe(true)
	})

	it('computed всегда mutable: false', () => {
		const model = compileComponent([{
			id: idA,
			props: [{ name: 'y', kind: 'computed' }],
			events: [],
		}])

		expect(model.props[0].mutable).toBe(false)
	})

	it('уважает явный mutable: false для state', () => {
		const model = compileComponent([{
			id: idA,
			props: [{ name: 'z', kind: 'state', mutable: false }],
			events: [],
		}])

		expect(model.props[0].mutable).toBe(false)
	})

	it('добавляет ownerId из контрибуции', () => {
		const model = compileComponent([{
			id: idA,
			props: [{ name: 'a', kind: 'state' }],
			events: [],
		}])

		expect(model.props[0].ownerId).toBe(idA)
	})

	it('объединяет props из нескольких контрибуций', () => {
		const model = compileComponent([
			{ id: idA, props: [{ name: 'a', kind: 'state' }], events: [] },
			{ id: idB, props: [{ name: 'b', kind: 'state' }], events: [] },
		])

		expect(model.props).toHaveLength(2)
		expect(model.props[0].ownerId).toBe(idA)
		expect(model.props[1].ownerId).toBe(idB)
	})

	it('собирает события из контрибуций', () => {
		const model = compileComponent([{
			id: idA,
			props: [],
			events: ['show', 'hide'],
		}])

		expect(model.events).toContain('show')
		expect(model.events).toContain('hide')
	})

	it('дедуплицирует события', () => {
		const model = compileComponent([
			{ id: idA, props: [], events: ['ready'] },
			{ id: idB, props: [], events: ['ready'] },
		])

		expect(model.events).toEqual(['ready'])
	})

	it('пробрасывает triggers в скомпилированную модель', () => {
		const model = compileComponent([{
			id: idA,
			props: [{ name: 'x', kind: 'state', triggers: ['change:x'] }],
			events: [],
		}])

		expect(model.props[0].triggers).toEqual(['change:x'])
	})

	it('принимает одну contribution без массива', () => {
		const model = compileComponent({ id: idA, props: [{ name: 'x', kind: 'state' }], events: ['show'] })

		expect(model.props).toHaveLength(1)
		expect(model.events).toContain('show')
	})

	it('принимает IComponentModel как источник (наследование)', () => {
		const parent = compileComponent({ id: idA, props: [{ name: 'a', kind: 'state' }], events: ['show'] })
		const child = compileComponent([parent, { id: idB, props: [{ name: 'b', kind: 'state' }], events: ['hide'] }])

		expect(child.props.map(p => p.name)).toEqual(['a', 'b'])
		expect(child.events).toContain('show')
		expect(child.events).toContain('hide')
	})

	it('наследует ownerId props из родительской модели без изменений', () => {
		const parent = compileComponent({ id: idA, props: [{ name: 'a', kind: 'state' }], events: [] })
		const child = compileComponent([parent, { id: idB, props: [{ name: 'b', kind: 'state' }], events: [] }])

		expect(child.props[0].ownerId).toBe(idA)
		expect(child.props[1].ownerId).toBe(idB)
	})

	it('дедуплицирует события при наследовании модели', () => {
		const parent = compileComponent({ id: idA, props: [], events: ['show', 'hide'] })
		const child = compileComponent([parent, { id: idB, props: [], events: ['hide'] }])

		expect(child.events.filter(e => e === 'hide')).toHaveLength(1)
	})
})
