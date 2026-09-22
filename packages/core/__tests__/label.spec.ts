import { describe, it, expect, vi } from 'vitest'
import { TCheckBox, TLabel, TSwitch } from '@soldy-ui/core'

/**
 * Подпись контрола: корень `label`, текст и сторона текста.
 *
 * Сторона — union ядра: смысл у неё один в любой теме. Модификатор стоит
 * всегда, как `--size-*`, и тема рисует по нему сторону; порядок в DOM от
 * стороны не зависит.
 */
describe('TLabel', () => {
	it('умолчания: корень label, пустой текст, текст после контрола', () => {
		const label = new TLabel()

		expect(label.tag).toBe('label')
		expect(label.text).toBe('')
		expect(label.position).toBe('end')
		expect(label.classes.toArray()).toEqual([
			's-label',
			's-label--size-normal',
			's-label--position-end',
		])
	})

	it('пропы конструктора', () => {
		const label = new TLabel({
			text: 'Согласен',
			position: 'top',
			size: 'lg',
			variant: 'brand',
		})

		expect(label.text).toBe('Согласен')
		expect(label.position).toBe('top')
		expect(label.classes.toArray()).toContain('s-label--position-top')
		expect(label.classes.toArray()).toContain('s-label--size-lg')
		expect(label.classes.toArray()).toContain('s-label--variant-brand')
	})

	it.each(['start', 'end', 'top', 'bottom'] as const)(
		'модификатор стороны %s ставится всегда',
		(position) => {
			const modifiers = new TLabel({ position }).classes
				.toArray()
				.filter((cls) => cls.startsWith('s-label--position-'))

			expect(modifiers).toEqual([`s-label--position-${position}`])
		},
	)

	it('смена стороны меняет модификатор и шлёт change:position только на смену', () => {
		const label = new TLabel()
		const changed = vi.fn()

		label.events.on('change:position', changed)

		label.position = 'start'
		label.position = 'start'

		expect(changed).toHaveBeenCalledTimes(1)
		expect(changed).toHaveBeenCalledWith('start')
		expect(label.classes.toArray()).toContain('s-label--position-start')
		expect(label.classes.toArray()).not.toContain('s-label--position-end')
	})

	it('смена текста шлёт change:text только на смену', () => {
		const label = new TLabel({ text: 'До' })
		const changed = vi.fn()

		label.events.on('change:text', changed)

		label.text = 'После'
		label.text = 'После'

		expect(changed).toHaveBeenCalledTimes(1)
		expect(changed).toHaveBeenCalledWith({ newValue: 'После', oldValue: 'До' })
	})

	it('getProps отдаёт text и position', () => {
		const label = new TLabel({ text: 'Согласен', position: 'bottom' })

		expect(label.getProps()).toMatchObject({
			tag: 'label',
			text: 'Согласен',
			position: 'bottom',
		})
		expect(label.toJSON()).toEqual(label.getProps())
	})

	/** Своего `disabled` у подписи нет: состояние у контрола. */
	it('не выключается сама: ни disabled, ни data-disabled', () => {
		const label = new TLabel()

		expect('disabled' in label).toBe(false)
		expect(label.dataset.has('disabled')).toBe(false)
		expect(label.attrs.has('disabled')).toBe(false)
	})
})

/**
 * Внутри `label` HTML разрешает только строчную разметку, поэтому контролы,
 * которые подписывает Label, рисуют корень `span`.
 */
describe('корень контролов подписи', () => {
	it.each([
		['TCheckBox', () => new TCheckBox()],
		['TSwitch', () => new TSwitch()],
	] as const)('%s — span по умолчанию', (_name, create) => {
		expect(create().tag).toBe('span')
	})

	it('заданный тег остаётся тегом корня', () => {
		expect(new TCheckBox({ tag: 'div' }).tag).toBe('div')
		expect(new TSwitch({ tag: 'div' }).tag).toBe('div')
	})
})
