import { describe, it, expect, vi } from 'vitest'
import { TCheckBox } from '@soldy/core'

describe('TCheckBox', () => {
	it('создаётся через { props } и через plain props', () => {
		const a = new TCheckBox({ value: true })
		expect(a.value).toBe(true)
		expect(a.classes.toArray()).toContain('s-check-box')

		const b = new TCheckBox({ value: false })
		expect(b.value).toBe(false)

		const c = new TCheckBox({
			value: true,
			size: 'xl',
			variant: 'brand',
			view: 'bare',
		})
		expect(c.classes.toArray()).toContain('s-check-box')
	})

	it('classes меняются от indeterminate/view + variant/size', () => {
		const cb = new TCheckBox({ size: 'normal' })
		expect(cb.classes.toArray()).toContain('s-check-box')

		cb.variant = 'danger'
		expect(cb.classes.toArray()).toContain('s-check-box--variant-danger')

		cb.size = 'xl'
		expect(cb.classes.toArray()).toContain('s-check-box--size-xl')

		cb.indeterminate = true
		expect(cb.classes.toArray()).toContain('s-check-box--indeterminate')

		cb.view = 'bare'
		expect(cb.classes.toArray()).toContain('s-check-box--view-bare')
	})

	/**
	 * `view` пришёл на место булева `plain`: флаг не давал теме ни второго вида,
	 * ни отказа от первого. Смена вида снимает прежний модификатор.
	 */
	it('view: смена меняет модификатор и эмитит change:view', () => {
		const cb = new TCheckBox({ view: 'bare' })
		const changeView = vi.fn()

		cb.events.on('change:view', changeView)

		cb.view = 'boxed'
		expect(cb.classes.toArray()).toContain('s-check-box--view-boxed')
		expect(cb.classes.toArray()).not.toContain('s-check-box--view-bare')
		expect(cb.getProps()).toMatchObject({ view: 'boxed' })

		cb.view = undefined
		expect(cb.classes.toArray().filter((cls) => cls.includes('--view-'))).toEqual([])
		expect(changeView.mock.calls).toEqual([['boxed'], [undefined]])
	})

	it('value: value setter эмитит change:value', () => {
		const cb = new TCheckBox({ value: false })
		const changeValue = vi.fn()

		cb.events.on('change:value', changeValue)

		cb.value = true
		expect(changeValue).toHaveBeenCalledWith({ newValue: true, oldValue: false })
	})
})
