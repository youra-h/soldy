import { describe, it, expect } from 'vitest'
import { TSpinner } from '@soldy-ui/core'

describe('TSpinner', () => {
	it('создаётся через { props } и через plain props', () => {
		const a = new TSpinner({ size: 'xl', variant: 'danger', borderWidth: 2 })
		expect(a.size).toBe('xl')
		expect(a.variant).toBe('danger')
		expect(a.borderWidth).toBe(2)
		expect(a.classes.toArray()).toContain('s-spinner')
		expect(a.classes.toArray()).toContain('s-spinner--size-xl')
		expect(a.classes.toArray()).toContain('s-spinner--variant-danger')

		const b = new TSpinner({ size: 'normal', variant: 'brand' })
		expect(b.classes.toArray()).toContain('s-spinner')
		expect(b.classes.toArray()).toContain('s-spinner--size-normal')
		expect(b.classes.toArray()).toContain('s-spinner--variant-brand')
	})

	it('смена size/variant меняет classes', () => {
		const s = new TSpinner({ size: 'normal', variant: 'brand' })
		expect(s.classes.toArray()).toContain('s-spinner--variant-brand')
		expect(s.classes.toArray()).not.toContain('s-spinner--variant-danger')

		s.variant = 'danger'
		expect(s.classes.toArray()).toContain('s-spinner--variant-danger')
		expect(s.classes.toArray()).not.toContain('s-spinner--variant-brand')

		s.size = 'xl'
		expect(s.classes.toArray()).toContain('s-spinner--size-xl')
	})

	it('getProps/toJSON отражают size/variant/borderWidth', () => {
		const s = new TSpinner({
			size: 'xl',
			variant: 'brand',
			borderWidth: 'auto',
		})
		const props = s.getProps()
		expect(props).toMatchObject({ size: 'xl', variant: 'brand', borderWidth: 'auto' })
		expect(s.toJSON()).toEqual(props)
	})
})

/**
 * Толщина кольца: своё значение и итог.
 *
 * Своё — как задано (`'auto'` или число), его отдаёт `getProps()`. Итог —
 * геттер `borderWidth`: при `'auto'` толщина по размеру. Сеттер сверяет со
 * своим, поэтому число, равное автоматической толщине, заменяет `'auto'` и
 * переживает смену размера, а `change:borderWidth` сообщает о смене итога — и
 * от записи, и от размера.
 */
describe('TSpinner: толщина кольца', () => {
	it('borderWidth при auto — по размеру, при числе — это число', () => {
		const s = new TSpinner()
		const sizes = ['sm', 'normal', 'lg', 'xl', '2xl'] as const
		const auto = sizes.map((size) => {
			s.size = size
			return s.borderWidth
		})

		s.borderWidth = 1

		const fixed = sizes.map((size) => {
			s.size = size
			return s.borderWidth
		})

		expect(auto).toEqual([1, 1, 1, 2, 2])
		expect(fixed).toEqual([1, 1, 1, 1, 1])
	})

	it('число, равное толщине по размеру, записывается своим и итога не меняет', () => {
		const s = new TSpinner({ size: 'xl' })
		const changes: Array<number | 'auto'> = []

		s.events.on('change:borderWidth', (value) => changes.push(value))
		s.borderWidth = 2

		expect(changes).toEqual([])
		expect(s.getProps().borderWidth).toBe(2)

		s.size = 'normal'

		expect(s.borderWidth).toBe(2)
		expect(changes).toEqual([])
	})

	it('при auto смена размера, сменившая толщину, шлёт change:borderWidth с итогом', () => {
		const s = new TSpinner()
		const changes: Array<number | 'auto'> = []

		s.events.on('change:borderWidth', (value) => changes.push(value))
		s.size = 'lg'
		s.size = 'xl'
		s.size = '2xl'
		s.size = 'normal'

		expect(changes).toEqual([2, 1])
	})
})
