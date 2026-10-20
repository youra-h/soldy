/**
 * NumberInput на сервере: компоненты собраны для сервера, рисует их `render`
 * из `svelte/server` — как сервер приложения.
 *
 * В браузере текст ввода ставит attachment (`fieldText`), а attachment-ов на
 * сервере нет: текст уходит атрибутом `value` — строкой формата по локали
 * поддерева, — и поле показывает его с первой отрисовки. В форму уходит
 * скрытое поле с числом, а не текст. Имена кнопок шага плагин имён пишет при
 * установке, синхронно: они есть уже в серверной разметке. Гидратацию пакет
 * не проверит: в одном прогоне компоненты собраны под одно окружение
 * (`vitest.config.ts`).
 */

import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import { ruRU } from '@soldy-ui/plugins'
import { NumberInput } from '@soldy-ui/svelte'
import FieldHarness from './Field.test.svelte'
import LocaleNumberInput from './LocaleNumberInput.test.svelte'

/**
 * Разметка сервера без комментариев: в них Svelte пишет метки гидратации
 * блоков и id монтирования (`<!--$s1-->`), а проверяется сама разметка.
 */
const markup = (body: string) => body.replace(/<!--[\s\S]*?-->/g, '')

/** Открывающий тег по признаку; нет его — тест падает здесь. */
function tagOf(body: string, pattern: RegExp): string {
	const tag = body.match(/<[a-z][^>]*>/g)?.find((candidate) => pattern.test(candidate))

	if (!tag) throw new Error(`в разметке нет ${pattern}: ${body}`)

	return tag
}

/** Ввод — по своему классу: рядом лежит скрытое поле формы. */
const inputOf = (body: string) => tagOf(body, /^<input [^>]*so-number-input__input/)

const hiddenOf = (body: string) => tagOf(body, /^<input [^>]*type="hidden"/)

describe('NumberInput · серверный рендер', () => {
	it('текст — атрибутом value в формате локали поддерева, число — в скрытом поле', () => {
		const body = markup(
			render(LocaleNumberInput, { props: { locale: ruRU, name: 'qty', value: 1234.5 } }).body,
		)

		expect(inputOf(body)).toContain(`value="${new Intl.NumberFormat('ru-RU').format(1234.5)}"`)
		expect(inputOf(body)).toContain('lang="ru-RU"')
		expect(inputOf(body)).not.toMatch(/\sname=/)
		expect(hiddenOf(body)).toContain('name="qty"')
		expect(hiddenOf(body)).toContain('value="1234.5"')
	})

	it('без значения — пустой ввод и пустое скрытое поле', () => {
		const body = markup(render(NumberInput, { props: { name: 'qty' } }).body)

		expect(inputOf(body)).not.toMatch(/\svalue="[^"]/)
		expect(hiddenOf(body)).not.toMatch(/\svalue="[^"]/)
	})

	it('наборы ввода и имена кнопок шага — в разметке сервера', () => {
		const body = markup(
			render(LocaleNumberInput, {
				props: { locale: ruRU, name: 'Количество', value: 5, min: 0 },
			}).body,
		)

		expect(inputOf(body)).toContain('role="spinbutton"')
		expect(inputOf(body)).toContain('aria-valuenow="5"')
		expect(inputOf(body)).toContain('aria-valuemin="0"')
		expect(inputOf(body)).toContain('inputmode="decimal"')
		expect(tagOf(body, /so-number-input__increment/)).toContain(
			'aria-label="Увеличить Количество"',
		)
		expect(tagOf(body, /so-number-input__decrement/)).toContain('tabindex="-1"')
	})

	it('в поле формы: for подписи — на id ввода, справка — в aria-describedby', () => {
		const body = markup(
			render(FieldHarness, {
				props: { label: 'Количество', helper: 'Целое число', controls: ['number-input'] },
			}).body,
		)
		const id = /\sid="([^"]+)"/.exec(inputOf(body))?.[1]
		const helper = /\sid="([^"]+)"/.exec(tagOf(body, /so-field__helper/))?.[1]

		expect(id).toBeDefined()
		expect(tagOf(body, /^<label [^>]*so-field__label/)).toContain(`for="${id}"`)
		expect(inputOf(body)).toContain(`aria-describedby="${helper}"`)
	})
})
