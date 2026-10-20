/**
 * NumberInput на сервере: JSX собран для сервера, рисует его `renderToString`
 * из `solid-js/web` — как сервер приложения.
 *
 * В браузере текст ввода ставит `ref` поля (`fieldText`), а `ref` на сервере не
 * зовётся: текст уходит атрибутом `value` — строкой формата по локали
 * поддерева, — и поле показывает его с первой отрисовки. В форму уходит
 * скрытое поле с числом, а не текст. Имена кнопок шага плагин имён пишет при
 * установке, синхронно: они есть уже в серверной разметке, где эффектов нет.
 * Гидратацию пакет не проверит: в одном прогоне компоненты собраны под одно
 * окружение (`vitest.config.ts`).
 */

import { describe, it, expect } from 'vitest'
import type { JSX } from 'solid-js'
import { renderToString } from 'solid-js/web'
import { ruRU } from '@soldy-ui/plugins'
import { Field, LocaleProvider, NumberInput } from '@soldy-ui/solid'

/**
 * Разметка сервера без меток гидратации: ключи узлов (`data-hk`) и
 * комментарии вокруг вставок пишет Solid для гидратации, а проверяется сама
 * разметка.
 */
const markup = (html: string) =>
	html.replace(/<!--[\s\S]*?-->/g, '').replace(/ data-hk="[^"]*"/g, '')

const render = (code: () => JSX.Element) => markup(renderToString(code))

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
		const body = render(() => (
			<LocaleProvider locale={ruRU}>
				<NumberInput name="qty" value={1234.5} />
			</LocaleProvider>
		))

		expect(inputOf(body)).toContain(`value="${new Intl.NumberFormat('ru-RU').format(1234.5)}"`)
		expect(inputOf(body)).toContain('lang="ru-RU"')
		expect(inputOf(body)).not.toMatch(/\sname=/)
		expect(hiddenOf(body)).toContain('name="qty"')
		expect(hiddenOf(body)).toContain('value="1234.5"')
	})

	it('без значения — пустой ввод и пустое скрытое поле', () => {
		const body = render(() => <NumberInput name="qty" />)

		expect(inputOf(body)).not.toMatch(/\svalue="[^"]/)
		expect(hiddenOf(body)).toContain('value=""')
	})

	it('наборы ввода и имена кнопок шага — в разметке сервера', () => {
		const body = render(() => (
			<LocaleProvider locale={ruRU}>
				<NumberInput name="Количество" value={5} min={0} />
			</LocaleProvider>
		))

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
		const body = render(() => (
			<Field label="Количество" helper="Целое число">
				<NumberInput />
			</Field>
		))
		const id = /\sid="([^"]+)"/.exec(inputOf(body))?.[1]
		const helper = /\sid="([^"]+)"/.exec(tagOf(body, /so-field__helper/))?.[1]

		expect(id).toBeDefined()
		expect(tagOf(body, /^<label [^>]*so-field__label/)).toContain(`for="${id}"`)
		expect(inputOf(body)).toContain(`aria-describedby="${helper}"`)
	})
})
