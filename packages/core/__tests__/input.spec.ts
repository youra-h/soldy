import { describe, it, expect, vi } from 'vitest'
import { TInput } from '@soldy-ui/core'

describe('TInput', () => {
	it('создаётся через { props } и через plain props', () => {
		const a = new TInput({ value: 'hello', readonly: true, required: true })
		expect(a.value).toBe('hello')
		expect(a.readonly).toBe(true)
		expect(a.required).toBe(true)
		expect(a.classes.toArray()).toContain('s-input')

		const b = new TInput({ value: 'world', readonly: false })
		expect(b.value).toBe('world')
		expect(b.readonly).toBe(false)
	})

	it('baseClass и модификаторы классов', () => {
		const input = new TInput()

		expect(input.classes.toArray()).toContain('s-input')

		input.variant = 'brand'
		expect(input.classes.toArray()).toContain('s-input--variant-brand')

		input.size = 'lg'
		expect(input.classes.toArray()).toContain('s-input--size-lg')

		input.readonly = true
		expect(input.classes.toArray()).toContain('s-input--readonly')

		input.required = true
		expect(input.classes.toArray()).toContain('s-input--required')
	})

	it('value setter эмитит change:value и input:value', () => {
		const input = new TInput({ value: 'a' })
		const changeHandler = vi.fn()
		const inputHandler = vi.fn()
		input.events.on('change:value', changeHandler)
		input.events.on('input:value', inputHandler)

		input.value = 'b'
		expect(changeHandler).toHaveBeenCalledWith({ newValue: 'b', oldValue: 'a' })
		expect(inputHandler).toHaveBeenCalledWith({ newValue: 'b', oldValue: 'a' })
		expect(input.value).toBe('b')

		input.value = 'c'
		expect(inputHandler).toHaveBeenNthCalledWith(2, { newValue: 'c', oldValue: 'b' })
		expect(input.value).toBe('c')
	})

	it('сеттеры эмитят change:* события для всех inherited свойств', () => {
		const input = new TInput()
		const readonly = vi.fn()
		const required = vi.fn()
		const disabled = vi.fn()
		const focused = vi.fn()
		const name = vi.fn()

		input.events.on('change:readonly', readonly)
		input.events.on('change:required', required)
		input.events.on('change:disabled', disabled)
		input.events.on('change:focused', focused)
		input.events.on('change:name', name)

		input.readonly = true
		expect(readonly).toHaveBeenCalledWith(true)

		input.required = true
		expect(required).toHaveBeenCalledWith(true)

		input.disabled = true
		expect(disabled).toHaveBeenCalledWith(true)

		input.focused = true
		expect(focused).toHaveBeenCalledWith(true)

		input.name = 'field'
		expect(name).toHaveBeenCalledWith('field')
	})

	it('getProps возвращает все inherited props', () => {
		const input = new TInput({
			value: 'test',
			name: 'email',
			disabled: true,
			focused: false,
			readonly: false,
			required: true,
			variant: 'brand',
			size: 'lg',
			visible: false,
			rendered: true,
		})

		const props = input.getProps()
		expect(props).toMatchObject({
			value: 'test',
			name: 'email',
			disabled: true,
			focused: false,
			readonly: false,
			required: true,
			variant: 'brand',
			size: 'lg',
			visible: false,
			rendered: true,
		})
	})

	it('toJSON эквивалентен getProps', () => {
		const input = new TInput({ value: 'x', readonly: true })
		expect(input.toJSON()).toEqual(input.getProps())
	})

	it('show/hide управляют visible', () => {
		const input = new TInput({ visible: false })
		expect(input.visible).toBe(false)

		input.show()
		expect(input.visible).toBe(true)

		input.hide()
		expect(input.visible).toBe(false)
	})

	it('assign обновляет несколько свойств разом', () => {
		const input = new TInput({ value: 'a', readonly: false })
		input.assign({ value: 'b', readonly: true })
		expect(input.value).toBe('b')
		expect(input.readonly).toBe(true)
	})
})

/**
 * Кнопка очистки — часть поля (база `TField`, общая с полем даты): признак,
 * модификатор, имя кнопки и команда `clear`. Рисует кнопку разметка поля.
 */
describe('TInput · очистка', () => {
	it('кнопки нет по умолчанию; clearable — модификатор и change:clearable', () => {
		const input = new TInput()
		const handler = vi.fn()

		expect(input.clearable).toBe(false)
		expect(input.classes.toArray()).not.toContain('s-input--clearable')

		input.events.on('change:clearable', handler)
		input.clearable = true

		expect(input.classes.toArray()).toContain('s-input--clearable')
		expect(handler).toHaveBeenCalledWith(true)

		input.clearable = true
		expect(handler).toHaveBeenCalledTimes(1)
	})

	describe('clearAria — набор кнопки', () => {
		it('имени ядро не строит: его с именем поля пишет плагин имён', () => {
			expect(new TInput({ name: 'Город' }).clearAria.has('aria-label')).toBe(false)
		})

		it('набор живой: запись — change:clearAria со снимком', () => {
			const input = new TInput({ name: 'Город' })
			const handler = vi.fn()

			input.events.on('change:clearAria', handler)
			input.clearAria.add('aria-label', 'Очистить Город')

			expect(handler).toHaveBeenCalledWith({ 'aria-label': 'Очистить Город' })
		})

		it('отдельный набор: это соседняя кнопка, а не само поле', () => {
			const input = new TInput({ name: 'Город' })

			input.clearAria.add('aria-label', 'Очистить Город')

			expect(input.aria.has('aria-label')).toBe(false)
		})
	})

	describe('clear', () => {
		it('очищает значение до пустой строки, потом шлёт clear', () => {
			const input = new TInput({ value: 'текст' })
			const seen: string[] = []

			input.events.on('change:value', ({ newValue }) => seen.push(`change:value ${newValue}`))
			input.events.on('clear', () => seen.push(`clear ${input.value}`))

			input.clear()

			expect(input.value).toBe('')
			expect(seen).toEqual(['change:value ', 'clear '])
		})

		/**
		 * Владелец поля очищает своё по событию: в `multiple` поле Select пусто и
		 * при выбранных тегах, а снять их обязана та же кнопка.
		 */
		it('у пустого поля clear приходит тоже', () => {
			const input = new TInput({ value: '' })
			const clear = vi.fn()
			const change = vi.fn()

			input.events.on('clear', clear)
			input.events.on('change:value', change)

			input.clear()

			expect(clear).toHaveBeenCalledTimes(1)
			expect(change).not.toHaveBeenCalled()
		})

		/**
		 * Кнопку только для чтения не гасят: select-only Select и есть `readonly`,
		 * а очистка там работает. Выключенное поле выключает кнопку, а код зовёт
		 * команду когда угодно.
		 */
		it('readonly и disabled её не останавливают', () => {
			const readonly = new TInput({ value: 'a', readonly: true })
			const disabled = new TInput({ value: 'b', disabled: true })

			readonly.clear()
			disabled.clear()

			expect(readonly.value).toBe('')
			expect(disabled.value).toBe('')
		})

		it('отменённая в change:value:before запись оставляет значение', () => {
			const input = new TInput({ value: 'текст' })

			input.events.on('change:value:before', (e) => e.preventDefault())
			input.clear()

			expect(input.value).toBe('текст')
		})

		/**
		 * Разметка отдаёт `clear` в scope слота без инстанса, и своя кнопка зовёт
		 * его голой функцией: метод прототипа потерял бы там `this`.
		 */
		it('взятая без инстанса — работает', () => {
			const input = new TInput({ value: 'текст' })
			const { clear } = input

			clear()

			expect(input.value).toBe('')
		})
	})

	it('getProps несёт clearable', () => {
		expect(new TInput({ clearable: true }).getProps()).toMatchObject({ clearable: true })
	})
})
