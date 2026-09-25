import { describe, it, expect } from 'vitest'
import { TSpinner } from '@soldy-ui/core'
import type { TComponentSize } from '@soldy-ui/core'

const SIZES: TComponentSize[] = ['sm', 'normal', 'lg', 'xl', '2xl']

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
 * Толщина кольца: заданная и итоговая.
 *
 * Геттер `borderWidth` при `'auto'` отдавал толщину по размеру, и число, равное
 * ей, адаптер считал тем же значением и не записывал: своё оставалось `'auto'`,
 * и смена размера меняла толщину, заданную явно. Теперь геттер отдаёт заданное,
 * а итог — `borderWidthResolved`.
 */
describe('TSpinner: толщина кольца', () => {
	it('borderWidth отдаёт толщину такой, как её записали', () => {
		const s = new TSpinner({ size: 'xl' })

		expect(s.borderWidth).toBe('auto')

		s.borderWidth = 2
		expect(s.borderWidth).toBe(2)

		s.borderWidth = 'auto'
		expect(s.borderWidth).toBe('auto')
	})

	it('borderWidthResolved при auto — по размеру', () => {
		const s = new TSpinner()
		const resolved = SIZES.map((size) => {
			s.size = size
			return [size, s.borderWidthResolved]
		})

		expect(resolved).toEqual([
			['sm', 1],
			['normal', 1],
			['lg', 1],
			['xl', 2],
			['2xl', 2],
		])
	})

	it('borderWidthResolved при числе — это число на любом размере', () => {
		const s = new TSpinner({ borderWidth: 1 })
		const resolved = SIZES.map((size) => {
			s.size = size
			return s.borderWidthResolved
		})

		expect(resolved).toEqual([1, 1, 1, 1, 1])
	})

	it('число, равное толщине по размеру, остаётся заданным', () => {
		const s = new TSpinner({ size: 'xl' })
		const changes: Array<number | 'auto'> = []

		s.events.on('change:borderWidth', (value) => changes.push(value))
		s.borderWidth = 2

		expect(changes).toEqual([2])

		s.size = 'normal'

		expect(s.borderWidth).toBe(2)
		expect(s.borderWidthResolved).toBe(2)
	})
})
