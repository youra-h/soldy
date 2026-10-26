import { describe, it, expect, vi } from 'vitest'
import { TControl } from '@soldy-ui/core'
import type { IControlProps } from '@soldy-ui/core'

describe('TControl', () => {
	it('дисейбл/фокус трекают state и эмитят события', () => {
		const ctrl = new TControl<IControlProps>({ disabled: false, focused: false })
		const disabledHandler = vi.fn()
		const focusedHandler = vi.fn()
		ctrl.events.on('change:disabled', disabledHandler)
		ctrl.events.on('change:focused', focusedHandler)

		ctrl.disabled = true
		expect(ctrl.disabled).toBe(true)
		expect(disabledHandler).toHaveBeenCalledWith(true)

		ctrl.focused = true
		expect(ctrl.focused).toBe(true)
		expect(focusedHandler).toHaveBeenCalledWith(true)
	})

	it('classes включает baseClass + state-модификаторы', () => {
		const ctrl = new TControl<IControlProps>({ size: 'normal', variant: 'danger' })
		ctrl.size = 'xl'
		ctrl.variant = 'brand'
		const classes = ctrl.classes.toArray()

		expect(classes).toContain('so-component-view')
		expect(classes).toContain('so-component-view--size-xl')
		expect(classes).toContain('so-component-view--variant-brand')
	})

	/**
	 * The `disabled` setter writes the sets after the write and before its
	 * event: a `change:disabled` subscriber already reads the new state, and
	 * the adapter exchange (a listener of the whole bus) gets the nested set
	 * events first — the order the first handler of `change:disabled` used to
	 * give.
	 */
	it('подписчик change:disabled видит досчитанные наборы, их события — раньше', () => {
		const native = new TControl<IControlProps>({ tag: 'button' })
		const plain = new TControl<IControlProps>({ tag: 'div' })
		const seen: unknown[] = []
		const order: string[] = []

		native.events.on('change:disabled', () =>
			seen.push(native.attrs.get('disabled'), native.dataset.get('disabled')),
		)
		plain.events.on('change:disabled', () => seen.push(plain.aria.get('aria-disabled')))
		native.events.listen((event) => order.push(String(event)))

		native.disabled = true
		plain.disabled = true

		expect(seen).toEqual(['disabled', 'true', 'true'])
		expect(order).toEqual([
			'change:disabled:before',
			'change:attrs',
			'change:dataset',
			'change:disabled',
		])
	})

	it('подписчик change:tag видит наборы по новому тегу', () => {
		const ctrl = new TControl<IControlProps>({ tag: 'div', disabled: true })
		const seen: unknown[] = []
		const order: string[] = []

		ctrl.events.on('change:tag', () =>
			seen.push(ctrl.attrs.get('disabled'), ctrl.aria.get('aria-disabled')),
		)
		ctrl.events.listen((event) => order.push(String(event)))

		ctrl.tag = 'button'

		expect(seen).toEqual(['disabled', undefined])
		expect(order).toEqual(['change:attrs', 'change:aria', 'change:tag', 'change:labelable'])
	})

	it('getProps возвращает variant/size/disabled/focused', () => {
		const ctrl = new TControl<IControlProps>({
			size: 'sm',
			variant: 'brand',
			disabled: true,
			focused: false,
		})
		expect(ctrl.getProps()).toMatchObject({
			variant: 'brand',
			size: 'sm',
			disabled: true,
			focused: false,
		})
	})
})
