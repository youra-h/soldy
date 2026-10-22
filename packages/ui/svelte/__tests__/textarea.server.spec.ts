/**
 * Textarea на сервере: компоненты собраны для сервера, рисует их `render` из
 * `svelte/server` — как сервер приложения.
 *
 * В браузере текст поля ставит attachment, а attachment-ов на сервере нет:
 * текст уходит содержимым `<textarea>` — атрибута `value` у неё нет, — и поле
 * показывает его с первой отрисовки. При гидратации содержимое сервера Svelte
 * снимает, а текст в узел возвращает attachment — это проверяет
 * `hydration/root.hydration.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import { Textarea, type TextareaProps } from '@soldy-ui/svelte'
import FieldTextarea from './FieldTextarea.test.svelte'

/**
 * Разметка сервера без комментариев: в них Svelte пишет метки гидратации
 * блоков и id монтирования (`<!--$s1-->`), а проверяется сама разметка.
 */
const markup = (body: string) => body.replace(/<!--[\s\S]*?-->/g, '')

/** Поле в серверной разметке: открывающий тег и содержимое. */
function fieldOf(props: TextareaProps): { tag: string; text: string } {
	const body = markup(render(Textarea, { props }).body)
	const found = /(<textarea\s[^>]*>)([\s\S]*?)<\/textarea>/.exec(body)

	if (!found) throw new Error(`в разметке нет поля: ${body}`)

	return { tag: found[1] ?? '', text: found[2] ?? '' }
}

describe('Textarea · серверный рендер', () => {
	it('значение — содержимым <textarea>, не атрибутом value', () => {
		const { tag, text } = fieldOf({ value: 'abc' })

		expect(text).toBe('abc')
		expect(tag).not.toMatch(/\svalue=/)
	})

	it('содержимое экранировано', () => {
		expect(fieldOf({ value: '<b>&</b>' }).text).toBe('&lt;b>&amp;&lt;/b>')
	})

	it('без значения — пустое поле', () => {
		expect(fieldOf({}).text).toBe('')
	})

	it('без своего id атрибута нет: автоматического id у поля нет', () => {
		expect(fieldOf({ value: 'abc' }).tag).not.toMatch(/\sid=/)
	})

	it('нативные атрибуты и набор поля — на <textarea>', () => {
		const { tag } = fieldOf({
			id: 'about',
			rows: 4,
			maxlength: 200,
			readonly: true,
			required: true,
			aria_label: 'О себе',
		})

		expect(tag).toMatch(/\sid="about"/)
		expect(tag).toMatch(/\srows="4"/)
		expect(tag).toMatch(/\smaxlength="200"/)
		expect(tag).toMatch(/\sreadonly/)
		expect(tag).toMatch(/\srequired/)
		expect(tag).toContain('aria-required="true"')
		expect(tag).toContain('aria-label="О себе"')
	})

	it('счётчик с текстом — в разметке, поле ссылается на него, data-limit — на корне', () => {
		const body = markup(
			render(Textarea, { props: { value: 'abc', maxlength: 3, counter: true } }).body,
		)
		const id = /<div class="so-textarea__counter"[^>]*\sid="([^"]+)"/.exec(body)?.[1]

		expect(body).toMatch(/^<div [^>]*data-limit="reached"/)
		expect(id).toBeDefined()
		expect(body).toMatch(/<div class="so-textarea__counter"[^>]*>3 \/ 3<\/div>/)
		expect(body).toMatch(new RegExp(`<textarea\\s[^>]*aria-describedby="${id}"`))
	})

	it('в поле формы: справка и счётчик — в aria-describedby поля', () => {
		const body = markup(
			render(FieldTextarea, {
				props: { label: 'О себе', helper: 'Подсказка', counter: true, maxlength: 200 },
			}).body,
		)
		const ids = ['so-field__helper', 'so-textarea__counter'].map(
			(part) => new RegExp(`class="${part}"[^>]*\\sid="([^"]+)"`).exec(body)?.[1],
		)

		expect(ids).not.toContain(undefined)
		expect(body).toMatch(new RegExp(`<textarea\\s[^>]*aria-describedby="${ids.join(' ')}"`))
	})
})
