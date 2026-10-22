/**
 * Input на сервере: компоненты собраны для сервера, рисует их `render` из
 * `svelte/server` — как сервер приложения.
 *
 * В браузере текст поля ставит attachment, а attachment-ов на сервере нет:
 * текст уходит атрибутом `value`, и поле показывает его с первой отрисовки.
 * Текст поля после гидратации — `hydration/root.hydration.spec.ts`. Что `id`
 * поля сервер не придумывает, видно и здесь.
 */

import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import { Input } from '@soldy-ui/svelte'
import type { InputProps } from '@soldy-ui/svelte'

/**
 * Открывающий тег поля в серверной разметке. Комментарии — метки гидратации
 * блоков — срезаны: проверяется сама разметка.
 */
function fieldOf(props: InputProps): string {
	const body = render(Input, { props }).body.replace(/<!--[\s\S]*?-->/g, '')
	const tag = /<input\s[^>]*>/.exec(body)

	if (!tag) throw new Error(`в разметке нет поля: ${body}`)

	return tag[0]
}

describe('Input · серверный рендер', () => {
	it('значение — атрибутом value', () => {
		expect(fieldOf({ value: 'abc' })).toContain('value="abc"')
	})

	it('без значения атрибута value нет', () => {
		expect(fieldOf({})).not.toMatch(/\svalue=/)
	})

	it('без своего id атрибута нет: автоматического id у поля нет', () => {
		expect(fieldOf({ value: 'abc' })).not.toMatch(/\sid=/)
	})

	it('заданный id — как есть', () => {
		expect(fieldOf({ id: 'field', value: 'abc' })).toMatch(/\sid="field"/)
	})

	it('нативные атрибуты и набор поля — на <input>', () => {
		const tag = fieldOf({ readonly: true, required: true, aria_label: 'Поиск' })

		expect(tag).toMatch(/\sreadonly/)
		expect(tag).toMatch(/\srequired/)
		expect(tag).toContain('aria-required="true"')
		expect(tag).toContain('aria-label="Поиск"')
	})
})
