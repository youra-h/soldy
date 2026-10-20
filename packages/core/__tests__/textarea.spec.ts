/**
 * TTextarea — многострочное поле семьи Input.
 *
 * Ядро хранит свойства поля и автороста, ставит `aria` вложенной `<textarea>`
 * и `data-limit` корню по набранному и пределу `maxlength`. Высоту мерит
 * плагин автороста (`plugins/__tests__/textarea-autoresize.plugin.spec.ts`),
 * текст счётчика пишет плагин имён (`plugins/__tests__/names.plugin.spec.ts`),
 * раскладку — браузер (`playground/vue/browser/textarea.spec.ts`).
 */

import { describe, it, expect, vi } from 'vitest'
import { TTextarea } from '@soldy-ui/core'

describe('умолчания', () => {
	it('две строки, без потолка, без предела; авторост и счётчик выключены', () => {
		const textarea = new TTextarea()

		expect(textarea.value).toBe('')
		expect(textarea.placeholder).toBe('')
		expect(textarea.rows).toBe(2)
		expect(textarea.maxRows).toBe(0)
		expect(textarea.maxlength).toBeUndefined()
		expect(textarea.autoresize).toBe(false)
		expect(textarea.counter).toBe(false)
		expect(textarea.textLength).toBe(0)
	})

	it('умолчания объявлены у класса: ключ предела есть и без значения', () => {
		expect(TTextarea.defaultValues).toMatchObject({
			value: '',
			placeholder: '',
			rows: 2,
			maxRows: 0,
			autoresize: false,
			counter: false,
		})
		expect('maxlength' in TTextarea.defaultValues).toBe(true)
		expect(TTextarea.defaultValues.maxlength).toBeUndefined()
	})

	it('блок so-textarea, модификаторы размера, варианта, readonly и required', () => {
		const textarea = new TTextarea({ size: 'lg', readonly: true, required: true })

		expect(textarea.classes.toArray()).toEqual(
			expect.arrayContaining([
				'so-textarea',
				'so-textarea--size-lg',
				'so-textarea--readonly',
				'so-textarea--required',
			]),
		)

		textarea.variant = 'brand'

		expect(textarea.classes.toArray()).toContain('so-textarea--variant-brand')
	})

	it('свойства из конструктора — как заданы', () => {
		const textarea = new TTextarea({
			value: 'Текст',
			placeholder: 'Комментарий',
			rows: 3,
			maxRows: 6,
			maxlength: 200,
			autoresize: true,
			counter: true,
		})

		expect(textarea.getProps()).toMatchObject({
			value: 'Текст',
			placeholder: 'Комментарий',
			rows: 3,
			maxRows: 6,
			maxlength: 200,
			autoresize: true,
			counter: true,
		})
	})
})

describe('сеттеры', () => {
	it.each([
		['placeholder', 'Комментарий'],
		['rows', 4],
		['maxRows', 8],
		['maxlength', 140],
		['autoresize', true],
		['counter', true],
	] as const)('%s: change:%s на смену, то же значение — молча', (name, value) => {
		const textarea = new TTextarea()
		const handler = vi.fn()

		textarea.events.on(`change:${name}`, handler)

		Reflect.set(textarea, name, value)
		Reflect.set(textarea, name, value)

		expect(Reflect.get(textarea, name)).toBe(value)
		expect(handler).toHaveBeenCalledExactlyOnceWith(value)
	})

	it('maxlength снимается undefined', () => {
		const textarea = new TTextarea({ maxlength: 10 })
		const handler = vi.fn()

		textarea.events.on('change:maxlength', handler)
		textarea.maxlength = undefined

		expect(textarea.maxlength).toBeUndefined()
		expect(handler).toHaveBeenCalledExactlyOnceWith(undefined)
	})
})

/**
 * `aria` стоит на вложенной `<textarea>`: её `disabled`, `required` и
 * `readonly` нативные, и ARIA-дублей ядро не пишет — кроме `aria-required` у
 * поля только для чтения, которое браузер не проверяет. Так же у Input.
 */
describe('aria поля', () => {
	it('required и readonly — без ARIA-дублей', () => {
		const required = new TTextarea({ required: true })
		const readonly = new TTextarea({ readonly: true })

		expect(required.aria.has('aria-required')).toBe(false)
		expect(readonly.aria.has('aria-readonly')).toBe(false)
	})

	it('required у поля только для чтения — aria-required, снимается вместе с ним', () => {
		const textarea = new TTextarea({ required: true, readonly: true })

		expect(textarea.aria.get('aria-required')).toBe('true')

		textarea.readonly = false

		expect(textarea.aria.has('aria-required')).toBe(false)

		textarea.readonly = true
		textarea.required = false

		expect(textarea.aria.has('aria-required')).toBe(false)
	})

	it('выключенное: нативный disabled поля — без aria-disabled, у корня-div его нет', () => {
		const textarea = new TTextarea({ disabled: true })

		expect(textarea.aria.has('aria-disabled')).toBe(false)
		expect(textarea.attrs.has('disabled')).toBe(false)
		expect(textarea.dataset.get('data-disabled')).toBe('true')
	})

	it('поле labelable: подпись поля формы называет его своим for', () => {
		expect(new TTextarea().labelable).toBe(true)
	})

	it('ошибка — data-invalid корню, aria-invalid полю', () => {
		const textarea = new TTextarea()

		textarea.invalid = true

		expect(textarea.dataset.get('data-invalid')).toBe('true')
		expect(textarea.aria.get('aria-invalid')).toBe('true')
	})
})

/**
 * Набор счётчика — разметки внутри поля без своего экземпляра, поэтому набор
 * поля. `id` счётчика и ссылку поля на него пишет плагин связок
 * (`plugins/__tests__/ids.plugin.spec.ts`), ядро только держит набор.
 */
describe('набор счётчика', () => {
	it('пуст и при включённом счётчике: id и ссылку пишет не ядро', () => {
		const textarea = new TTextarea({ counter: true })

		expect(textarea.counterAria.toObject()).toEqual({})
		expect(textarea.aria.has('aria-describedby')).toBe(false)
	})

	it('живой: запись — change:counterAria со снимком, та же — молча', () => {
		const textarea = new TTextarea()
		const handler = vi.fn()

		textarea.events.on('change:counterAria', handler)

		textarea.counterAria.add('id', 'm1-counter')
		textarea.counterAria.add('id', 'm1-counter')

		expect(handler).toHaveBeenCalledExactlyOnceWith({ id: 'm1-counter' })
	})
})

describe('textLength — как считает браузер для maxlength', () => {
	it('единицы UTF-16: символ вне BMP — два', () => {
		expect(new TTextarea({ value: 'ab' }).textLength).toBe(2)
		expect(new TTextarea({ value: '😀' }).textLength).toBe(2)
	})

	it('перевод строки — один символ в любой записи', () => {
		expect(new TTextarea({ value: 'a\nb' }).textLength).toBe(3)
		expect(new TTextarea({ value: 'a\r\nb' }).textLength).toBe(3)
		expect(new TTextarea({ value: 'a\rb' }).textLength).toBe(3)
	})
})

/**
 * `data-limit` — набранное у предела: `reached` — ровно `maxlength`,
 * `exceeded` — больше (значение из кода браузер не обрезает). Ниже предела и
 * без него атрибута нет. От `counter` не зависит.
 */
describe('data-limit', () => {
	const limit = (textarea: TTextarea) => textarea.dataset.get('data-limit')

	it('без предела атрибута нет при любой длине', () => {
		const textarea = new TTextarea({ value: 'x'.repeat(500) })

		expect(textarea.dataset.has('data-limit')).toBe(false)
	})

	it('на обеих границах предела — по смене значения', () => {
		const textarea = new TTextarea({ maxlength: 5, value: 'abcd' })

		expect(textarea.dataset.has('data-limit')).toBe(false)

		textarea.value = 'abcde'
		expect(limit(textarea)).toBe('reached')

		textarea.value = 'abcdef'
		expect(limit(textarea)).toBe('exceeded')

		textarea.value = 'abc'
		expect(textarea.dataset.has('data-limit')).toBe(false)
	})

	it('с первой отрисовки: значение из конструктора уже у предела', () => {
		expect(limit(new TTextarea({ maxlength: 3, value: 'abc' }))).toBe('reached')
		expect(limit(new TTextarea({ maxlength: 3, value: 'abcd' }))).toBe('exceeded')
	})

	it('по смене предела: ужали — превышение, сняли — атрибута нет', () => {
		const textarea = new TTextarea({ value: 'abcd', maxlength: 10 })

		textarea.maxlength = 4
		expect(limit(textarea)).toBe('reached')

		textarea.maxlength = 2
		expect(limit(textarea)).toBe('exceeded')

		textarea.maxlength = undefined
		expect(textarea.dataset.has('data-limit')).toBe(false)
	})

	it('перевод строки CR LF у предела — один символ', () => {
		expect(limit(new TTextarea({ maxlength: 3, value: 'a\r\nb' }))).toBe('reached')
	})

	it('от counter не зависит', () => {
		const textarea = new TTextarea({ maxlength: 2, value: 'ab' })

		expect(limit(textarea)).toBe('reached')

		textarea.counter = true

		expect(limit(textarea)).toBe('reached')
	})
})
