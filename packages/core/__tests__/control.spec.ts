import { describe, it, expect, vi } from 'vitest'
import { TControl, bindDisabledToOwner } from '@soldy-ui/core'
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

	/**
	 * Без владельца своё и итог совпадают, и смена своего сообщает об обоих.
	 * В обработчике любого из двух событий оба геттера уже новые.
	 */
	it('самостоятельный контрол: своё и итог равны, на смену — оба события', () => {
		const ctrl = new TControl<IControlProps>()
		const seen: string[] = []

		ctrl.events.on('change:disabled', (value) => {
			seen.push(`disabled:${value}:${ctrl.disabled}:${ctrl.resolvedDisabled}`)
		})
		ctrl.events.on('change:resolvedDisabled', (value) => {
			seen.push(`resolved:${value}:${ctrl.disabled}:${ctrl.resolvedDisabled}`)
		})

		ctrl.disabled = true

		expect(ctrl.resolvedDisabled).toBe(true)
		expect(seen).toEqual(['resolved:true:true:true', 'disabled:true:true:true'])
		expect(ctrl.dataset.get('disabled')).toBe('true')
	})

	/**
	 * Своё — вход и `getProps()`, итог — наборы: выключенный владелец выключает
	 * контрол, не трогая его своё значение.
	 */
	it('с владельцем: disabled и getProps — своё, resolvedDisabled и наборы — итог', () => {
		const ctrl = new TControl<IControlProps>({ tag: 'button' })

		bindDisabledToOwner(ctrl, { resolvedDisabled: true })

		expect(ctrl.disabled).toBe(false)
		expect(ctrl.getProps()).toMatchObject({ disabled: false })
		expect(ctrl.resolvedDisabled).toBe(true)
		expect(ctrl.attrs.get('disabled')).toBe('disabled')
		expect(ctrl.dataset.get('disabled')).toBe('true')
	})

	it('classes включает baseClass + state-модификаторы', () => {
		const ctrl = new TControl<IControlProps>({ size: 'normal', variant: 'danger' })
		ctrl.size = 'xl'
		ctrl.variant = 'brand'
		const classes = ctrl.classes.toArray()

		expect(classes).toContain('s-component-view')
		expect(classes).toContain('s-component-view--size-xl')
		expect(classes).toContain('s-component-view--variant-brand')
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
