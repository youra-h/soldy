/**
 * Input на сервере: JSX собран для сервера, рисует его `renderToString` из
 * `solid-js/web` — как сервер приложения.
 *
 * В браузере текст поля ставит `ref` поля (`fieldText`), а `ref` на сервере не
 * зовётся: текст уходит атрибутом `value`, и поле показывает его с первой
 * отрисовки. Гидратацию проверяет отдельный прогон пакета (`hydration` в
 * `vitest.config.ts`) — пока только у коллекций разметкой. Что `id` поля
 * сервер не придумывает, видно и здесь.
 */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'solid-js/web'
import { Input, type InputProps } from '@soldy-ui/solid'

/**
 * Открывающий тег поля в серверной разметке. Комментарии — метки гидратации
 * вставок — срезаны: проверяется сама разметка.
 */
function fieldOf(props: InputProps): string {
	const body = renderToString(() => <Input {...props} />).replace(/<!--[\s\S]*?-->/g, '')
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

	it('кнопка очистки — с именем из локали, на месте у конца поля', () => {
		const body = renderToString(() => <Input clearable name="Город" />)

		expect(body).toMatch(/<button [^>]*aria-label="Clear Город"/)
		expect(body).toContain('so-input__trailing')
	})
})
