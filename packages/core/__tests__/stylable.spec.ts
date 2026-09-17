import { describe, it, expect, vi } from 'vitest'
import { TStylable, TStateUnit } from '@soldy/core'
import type { IStylableProps, TComponentSize } from '@soldy/core'

describe('TStylable', () => {
	it('size и variant выставляются и эмитят события', () => {
		const stylable = new TStylable<IStylableProps>({ size: 'normal', variant: 'danger' })
		const sizeHandler = vi.fn()
		const variantHandler = vi.fn()
		stylable.events.on('change:size', sizeHandler)
		stylable.events.on('change:variant', variantHandler)

		stylable.size = 'xl'
		expect(sizeHandler).toHaveBeenCalledWith({ newValue: 'xl', oldValue: 'normal' })
		expect(stylable.classes.toArray()).toContain('s-component-view--size-xl')

		stylable.variant = 'brand'
		expect(variantHandler).toHaveBeenCalledWith({ newValue: 'brand', oldValue: 'danger' })
		expect(stylable.classes.toArray()).toContain('s-component-view--variant-brand')
		expect(stylable.classes.toArray()).not.toContain('s-component-view--variant-danger')
	})

	/**
	 * Вариант — значение темы: без него модификатора нет вовсе, а сброс в
	 * `undefined` снимает прежний. `swapClass` с шаблонной строкой дал бы здесь
	 * класс `--variant-undefined`.
	 */
	it('variant без значения не ставит модификатор, сброс снимает прежний', () => {
		const stylable = new TStylable<IStylableProps>()
		const variantClasses = () =>
			stylable.classes.toArray().filter((cls) => cls.includes('--variant-'))

		expect(stylable.variant).toBeUndefined()
		expect(variantClasses()).toEqual([])

		stylable.variant = 'brand'
		expect(variantClasses()).toEqual(['s-component-view--variant-brand'])

		stylable.variant = undefined
		expect(variantClasses()).toEqual([])
	})

	it('getProps отражает size и variant', () => {
		const stylable = new TStylable<IStylableProps>({ size: 'lg', variant: 'brand' })
		expect(stylable.getProps()).toMatchObject({ size: 'lg', variant: 'brand' })
	})

	it('states.size позволяет передать внешний TStateUnit и классы обновляются при его изменении', () => {
		const customSizeState = new TStateUnit<TComponentSize>({ initial: 'xl' })

		const stylable = new TStylable<IStylableProps>({}, { states: { size: customSizeState } })

		expect(stylable.size).toBe('xl')

		customSizeState.value = 'sm'
		expect(stylable.size).toBe('sm')
		expect(stylable.classes.toArray()).toContain('s-component-view--size-sm')
	})

	it('states.size доступен через instance.states и setResolver меняет size', () => {
		const s = new TStylable<IStylableProps>({ size: 'normal' })

		expect(s.states.size).toBeDefined()
		expect(s.size).toBe('normal')

		s.states.size.setResolver(() => 'xl' as TComponentSize)

		expect(s.size).toBe('xl')
		expect(s.states.size.rawValue).toBe('normal')
	})

	it('states.variant доступен через instance.states и setResolver меняет variant', () => {
		const s = new TStylable<IStylableProps>({ variant: 'danger' })

		expect(s.states.variant).toBeDefined()
		expect(s.variant).toBe('danger')

		s.states.variant.setResolver(() => 'brand')

		expect(s.variant).toBe('brand')
		expect(s.states.variant.rawValue).toBe('danger')
	})
})
