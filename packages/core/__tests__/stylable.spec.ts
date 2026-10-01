import { describe, it, expect, vi } from 'vitest'
import { TStylable } from '@soldy-ui/core'
import type { IStylableProps } from '@soldy-ui/core'

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

	it('change:size:before ограничивает размер, классы ставит подправленный', () => {
		const stylable = new TStylable<IStylableProps>({ size: 'normal' })

		stylable.events.on('change:size:before', (e) => {
			if (e.value === '2xl') e.value = 'xl'
		})

		stylable.size = '2xl'

		expect(stylable.size).toBe('xl')
		expect(stylable.classes.toArray()).toContain('s-component-view--size-xl')
		expect(stylable.classes.toArray()).not.toContain('s-component-view--size-normal')
	})
})
