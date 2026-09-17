import { describe, it, expect } from 'vitest'
import { TButton } from '@soldy/core'

describe('TButton', () => {
	it('создаётся через { props } и через plain props', () => {
		const a = new TButton({ text: 'button 1' })
		expect(a.text).toBe('button 1')
		expect(a.classes.toArray()).toContain('s-button')

		const b = new TButton({ text: 'button 2' })
		expect(b.text).toBe('button 2')

		const c = new TButton({ text: 'x' })
		expect(c.classes.toArray()).toContain('s-button')
	})

	it('classes меняются при смене variant/size/view', () => {
		const btn = new TButton()

		btn.variant = 'brand'
		expect(btn.classes.toArray()).toContain('s-button--variant-brand')

		btn.size = 'xl'
		expect(btn.classes.toArray()).toContain('s-button--size-xl')

		btn.view = 'ghost'
		expect(btn.classes.toArray()).toContain('s-button--view-ghost')
	})

	it('getProps/toJSON отражают ключевые props', () => {
		const btn = new TButton({
			text: 't',
			variant: 'brand',
			size: 'lg',
			view: 'solid',
		})

		const props = btn.getProps()
		expect(props).toMatchObject({
			text: 't',
			variant: 'brand',
			size: 'lg',
			view: 'solid',
		})
		expect(btn.toJSON()).toEqual(props)
	})

	/**
	 * Вид темы снимается записью `undefined`. Раньше сеттер пропускал пустое
	 * значение (`if (value && …)`), и вернуться к виду по умолчанию было нельзя.
	 */
	it('view сбрасывается в undefined: модификатор снят, change:view пришёл', () => {
		const btn = new TButton({ view: 'ghost' })
		const seen: unknown[] = []

		btn.events.on('change:view', (value) => seen.push(value))

		btn.view = undefined

		expect(btn.view).toBeUndefined()
		expect(btn.classes.toArray().filter((cls) => cls.includes('--view-'))).toEqual([])
		expect(seen).toEqual([undefined])
	})
})
