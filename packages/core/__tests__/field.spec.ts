import { describe, it, expect, vi } from 'vitest'
import {
	TButton,
	TCheckBox,
	TDateInput,
	TDatePicker,
	TField,
	TInput,
	TListBox,
	TRadioGroup,
	TRating,
	TSelect,
	TSwitch,
	TValueControl,
} from '@soldy-ui/core'
import type { IValueControlProps } from '@soldy-ui/core'

/**
 * Поле формы: подпись, подсказка и ошибка вокруг контрола.
 *
 * Части — разметка поля, и стоят они, пока задан их текст: ссылки на части
 * ставит связка, а слотов она не видит. Ошибка видна при `invalid` и встаёт
 * на место подсказки. Сторона подписи — union ядра, модификатор стоит всегда.
 */
describe('TField', () => {
	it('умолчания: корень div, частей нет, подпись над контролом', () => {
		const field = new TField()

		expect(field.tag).toBe('div')
		expect(field.label).toBe('')
		expect(field.helper).toBe('')
		expect(field.error).toBe('')
		expect(field.invalid).toBe(false)
		expect(field.position).toBe('top')
		expect(field.helperRendered).toBe(false)
		expect(field.errorRendered).toBe(false)
		expect(field.classes.toArray()).toEqual([
			'so-field',
			'so-field--size-normal',
			'so-field--position-top',
		])
	})

	it('пропы конструктора', () => {
		const field = new TField({
			label: 'Почта',
			helper: 'Не покажем никому',
			error: 'Нет @',
			invalid: true,
			position: 'start',
			size: 'lg',
		})

		expect(field.label).toBe('Почта')
		expect(field.helper).toBe('Не покажем никому')
		expect(field.error).toBe('Нет @')
		expect(field.invalid).toBe(true)
		expect(field.position).toBe('start')
		expect(field.classes.toArray()).toContain('so-field--position-start')
		expect(field.classes.toArray()).toContain('so-field--size-lg')
		expect(field.getProps()).toMatchObject({
			label: 'Почта',
			helper: 'Не покажем никому',
			error: 'Нет @',
			invalid: true,
			position: 'start',
		})
	})

	it.each(['top', 'start', 'end'] as const)('модификатор стороны %s стоит всегда', (position) => {
		const modifiers = new TField({ position }).classes
			.toArray()
			.filter((cls) => cls.startsWith('so-field--position-'))

		expect(modifiers).toEqual([`so-field--position-${position}`])
	})

	it('смена стороны меняет модификатор и шлёт change:position только на смену', () => {
		const field = new TField()
		const changed = vi.fn()

		field.events.on('change:position', changed)

		field.position = 'end'
		field.position = 'end'

		expect(changed).toHaveBeenCalledTimes(1)
		expect(changed).toHaveBeenCalledWith('end')
		expect(field.classes.toArray()).toContain('so-field--position-end')
		expect(field.classes.toArray()).not.toContain('so-field--position-top')
	})

	it.each([
		['label', 'Почта'],
		['helper', 'Подсказка'],
		['error', 'Ошибка'],
	] as const)('%s: событие только на смену', (name, value) => {
		const field = new TField()
		const changed = vi.fn()

		field.events.on(`change:${name}`, changed)

		field[name] = value
		field[name] = value

		expect(changed).toHaveBeenCalledTimes(1)
		expect(changed).toHaveBeenCalledWith(value)
	})

	it('invalid: событие только на смену', () => {
		const field = new TField()
		const changed = vi.fn()

		field.events.on('change:invalid', changed)

		field.invalid = true
		field.invalid = true

		expect(changed).toHaveBeenCalledTimes(1)
		expect(changed).toHaveBeenCalledWith(true)
	})

	describe('какая справка видна', () => {
		it('подсказка — пока у неё есть текст', () => {
			const field = new TField({ helper: 'Подсказка' })

			expect(field.helperRendered).toBe(true)
			expect(field.errorRendered).toBe(false)

			field.helper = ''

			expect(field.helperRendered).toBe(false)
		})

		it('ошибка — при invalid и с текстом, и встаёт на место подсказки', () => {
			const field = new TField({ helper: 'Подсказка', error: 'Ошибка' })

			expect(field.errorRendered).toBe(false)
			expect(field.helperRendered).toBe(true)

			field.invalid = true

			expect(field.errorRendered).toBe(true)
			expect(field.helperRendered).toBe(false)
		})

		it('невалидное поле без текста ошибки ошибки не рисует, и подсказка остаётся', () => {
			const field = new TField({ helper: 'Подсказка', invalid: true })

			expect(field.errorRendered).toBe(false)
			expect(field.helperRendered).toBe(true)
		})
	})

	it('наборы частей живые: запись сообщает своё событие', () => {
		const field = new TField()
		const label = vi.fn()
		const helper = vi.fn()
		const error = vi.fn()

		field.events.on('change:labelAria', label)
		field.events.on('change:helperAria', helper)
		field.events.on('change:errorAria', error)

		field.labelAria.add('id', 'f-label')
		field.helperAria.add('id', 'f-helper')
		field.errorAria.add('id', 'f-error')

		expect(label).toHaveBeenCalledWith({ id: 'f-label' })
		expect(helper).toHaveBeenCalledWith({ id: 'f-helper' })
		expect(error).toHaveBeenCalledWith({ id: 'f-error' })
	})

	it('id частей ядро не пишет — их пишет плагин связок', () => {
		const field = new TField({ label: 'Почта', helper: 'Подсказка' })

		expect(field.labelAria.toObject()).toEqual({})
		expect(field.helperAria.toObject()).toEqual({})
		expect(field.errorAria.toObject()).toEqual({})
	})
})

/**
 * Ошибка контрола — свойство инстанса, а не проп: в разметке её задают полю
 * формы. Атрибуты — только у невалидного.
 */
describe('TValueControl · invalid', () => {
	type P = IValueControlProps<string>

	it('по умолчанию верно, и атрибутов ошибки нет', () => {
		const control = new TValueControl<string, P>()

		expect(control.invalid).toBe(false)
		expect(control.dataset.has('invalid')).toBe(false)
		expect(control.aria.has('aria-invalid')).toBe(false)
	})

	it('ошибка — data-invalid и aria-invalid, снятая — без атрибутов', () => {
		const control = new TValueControl<string, P>()

		control.invalid = true

		expect(control.dataset.get('invalid')).toBe('true')
		expect(control.aria.get('aria-invalid')).toBe('true')

		control.invalid = false

		expect(control.dataset.has('invalid')).toBe(false)
		expect(control.aria.has('aria-invalid')).toBe(false)
	})

	it('change:invalid — только на смену итога', () => {
		const control = new TValueControl<string, P>()
		const changed = vi.fn()

		control.events.on('change:invalid', changed)

		control.invalid = true
		control.invalid = true
		control.invalid = false

		expect(changed.mock.calls).toEqual([[true], [false]])
	})

	it('не проп: в getProps его нет', () => {
		const control = new TValueControl<string, P>()

		control.invalid = true

		expect(control.getProps()).not.toHaveProperty('invalid')
	})

	it('у строк списков и прочих контролов вне формы атрибута нет', () => {
		const list = new TListBox()

		expect(list.dataset.has('invalid')).toBe(false)
	})
})

describe('составные контролы отдают ошибку вниз', () => {
	it('Select — своему полю: рамку красит тема поля, aria-invalid — на его <input>', () => {
		const select = new TSelect()

		select.invalid = true

		expect(select.field.invalid).toBe(true)
		expect(select.dataset.get('invalid')).toBe('true')
		expect(select.field.dataset.get('invalid')).toBe('true')
		expect(select.field.aria.get('aria-invalid')).toBe('true')

		select.invalid = false

		expect(select.field.invalid).toBe(false)
	})

	it('DatePicker — всем своим полям: aria-invalid у их частей', () => {
		const picker = new TDatePicker()

		picker.invalid = true

		for (const input of [picker.field, picker.start, picker.end]) {
			expect(input.invalid).toBe(true)
			expect(
				input.segments.every(
					(s) => s.type === 'literal' || s.aria['aria-invalid'] === 'true',
				),
			).toBe(true)
		}

		picker.invalid = false

		expect(picker.field.invalid).toBe(false)
	})

	it('ошибка DatePicker не стирает свою проверку поля: конец раньше начала остаётся ошибкой', () => {
		const picker = new TDatePicker({ mode: 'range', value: ['2026-09-20', '2026-09-10'] })

		expect(picker.end.invalid).toBe(true)

		picker.invalid = true
		picker.invalid = false

		expect(picker.end.invalid).toBe(true)
		expect(picker.start.invalid).toBe(false)
	})
})

/**
 * Поле даты проверяет значение само — границы и недоступные дни. Итог ошибки —
 * своё или своя проверка, как итог `value` у Slider: своё лежит в поле, итог
 * считает геттер.
 */
describe('TDateInput · итог invalid', () => {
	it('своя ошибка — без значения вне границ', () => {
		const input = new TDateInput()
		const segments = vi.fn()

		input.events.on('change:segments', segments)

		input.invalid = true

		expect(input.invalid).toBe(true)
		expect(input.dataset.get('invalid')).toBe('true')
		expect(input.aria.get('aria-invalid')).toBe('true')
		// Части перечитываются: aria-invalid у них по итогу
		expect(segments).toHaveBeenCalled()
		expect(
			input.segments
				.filter((s) => s.type !== 'literal')
				.every((s) => s.aria['aria-invalid'] === 'true'),
		).toBe(true)
	})

	it('значение вне границ — ошибка и без своей; своя её не снимает', () => {
		const input = new TDateInput({ value: '2026-05-12', min: '2026-06-01' })

		expect(input.invalid).toBe(true)

		input.invalid = true
		input.invalid = false

		expect(input.invalid).toBe(true)
		expect(input.dataset.get('invalid')).toBe('true')
	})

	it('change:invalid — о смене итога: и от границ, и от значения', () => {
		const input = new TDateInput({ value: '2026-05-12' })
		const changed = vi.fn()

		input.events.on('change:invalid', changed)

		input.min = '2026-06-01'
		input.max = '2027-01-01'
		input.value = '2026-07-01'
		input.unavailable = (date) => date === '2026-07-01'

		expect(changed.mock.calls).toEqual([[true], [false], [true]])
	})

	it('своя ошибка при значении вне границ итог не меняет — событий нет', () => {
		const input = new TDateInput({ value: '2026-05-12', min: '2026-06-01' })
		const changed = vi.fn()

		input.events.on('change:invalid', changed)

		input.invalid = true
		input.min = undefined

		// Граница снята, а своя ошибка осталась: итог тот же
		expect(changed).not.toHaveBeenCalled()
		expect(input.invalid).toBe(true)
	})

	it('атрибуты ошибки — к первому событию значения уже по новому значению', () => {
		const input = new TDateInput({ min: '2026-06-01' })
		const seen: (string | undefined)[] = []

		input.events.on('change:value', () => seen.push(input.dataset.get('invalid')))

		input.value = '2026-05-12'

		expect(seen).toEqual(['true'])
	})
})

/**
 * Labelable ли элемент с `aria`: подпись поля формы называет его `for` и
 * передаёт ему клик. Решает тег элемента с `aria`, а не корня.
 */
describe('TControl · labelable', () => {
	it.each([
		['Input', () => new TInput()],
		['Select', () => new TSelect()],
		['CheckBox', () => new TCheckBox()],
		['Switch', () => new TSwitch()],
		['Rating', () => new TRating()],
		['Button', () => new TButton()],
	])('%s — labelable', (_name, create) => {
		expect(create().labelable).toBe(true)
	})

	it.each([
		['DateInput', () => new TDateInput()],
		['DatePicker', () => new TDatePicker()],
		['RadioGroup', () => new TRadioGroup()],
	])('%s — группа, не labelable', (_name, create) => {
		expect(create().labelable).toBe(false)
	})

	it('у элемента с aria на корне решает тег корня', () => {
		const button = new TButton({ tag: 'div' })

		expect(button.labelable).toBe(false)

		button.tag = 'button'

		expect(button.labelable).toBe(true)
	})

	it('Select — aria на поле: aria-disabled рядом с нативным disabled не пишется', () => {
		const select = new TSelect({ disabled: true })

		expect(select.aria.has('aria-disabled')).toBe(false)
	})
})
