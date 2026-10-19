/**
 * Field на сервере: JSX собран для сервера, рисует его `renderToString` из
 * `solid-js/web` — как сервер приложения.
 *
 * Связку поля с контролом сервер рисует целиком: ошибку, `id` поля и ссылки на
 * части контрол берёт при своей сборке, а сборка идёт и на сервере. `id`
 * частей и поля строит плагин связок от id монтирования поля, а он у Solid —
 * от `createUniqueId()`: на сервере Solid выводит его из места компонента в
 * дереве, и счёт у каждого рендера свой. Два рендера одной разметки дают одни
 * и те же `id` — их и найдёт гидратация. Счётчик набора, общий для процесса,
 * дал бы им разные.
 *
 * `for` подписи до приёма контрола ведёт на `id` поля, и разметку подписи
 * сервер напечатал раньше, чем собралась группа: у RadioGroup в разметке
 * сервера `for` остаётся, а называет её ссылка — точная.
 *
 * Гидратацию пакет не проверит: в одном прогоне компоненты собраны под одно
 * окружение.
 */

import { describe, it, expect } from 'vitest'
import type { JSX } from 'solid-js'
import { renderToString } from 'solid-js/web'
import { Field, Input, RadioGroup } from '@soldy-ui/solid'

/** Открывающий тег разметки: имя и атрибуты; атрибут без значения — пустая строка. */
type TTag = {
	readonly name: string
	readonly attributes: Readonly<Record<string, string>>
}

/**
 * Разметка сервера без меток гидратации: ключи узлов (`data-hk`) и
 * комментарии вокруг вставок пишет Solid для гидратации, а проверяется сама
 * разметка.
 */
const markup = (html: string) =>
	html.replace(/<!--[\s\S]*?-->/g, '').replace(/ data-hk="[^"]*"/g, '')

/** Открывающие теги разметки сервера по порядку. */
function tagsOf(body: string): TTag[] {
	const tags = markup(body).match(/<[a-z][^>]*>/g) ?? []

	return tags.map((tag) => {
		const name = /^<([a-z][\w-]*)/.exec(tag)?.[1] ?? ''
		const attributes: Record<string, string> = {}

		for (const [, attribute, value] of tag.matchAll(/\s([^\s="'>/]+)(?:="([^"]*)")?/g)) {
			attributes[attribute] = value ?? ''
		}

		return { name, attributes }
	})
}

/** Первый тег с классом `name`; нет его — тест падает здесь. */
function withClass(body: string, name: string): TTag {
	const tag = tagsOf(body).find((candidate) =>
		(candidate.attributes.class ?? '').split(' ').includes(name),
	)

	if (!tag) throw new Error(`в разметке нет .${name}: ${markup(body)}`)

	return tag
}

/** Первый тег по имени; нет его — тест падает здесь. */
function named(body: string, name: string): TTag {
	const tag = tagsOf(body).find((candidate) => candidate.name === name)

	if (!tag) throw new Error(`в разметке нет <${name}>: ${markup(body)}`)

	return tag
}

const render = (code: () => JSX.Element) => renderToString(code)

/** Поле с подписью и подсказкой и полем ввода внутри. */
const email = () => (
	<Field label="Почта" helper="Подсказка">
		<Input value="a" />
	</Field>
)

describe('Field · серверный рендер', () => {
	it('сервер рисует связку: for подписи, id поля и справку', () => {
		const body = render(email)
		const input = named(body, 'input')

		expect(input.attributes.id).toBeTruthy()
		expect(withClass(body, 'so-field__label').attributes.for).toBe(input.attributes.id)
		expect(input.attributes['aria-describedby']).toBe(
			withClass(body, 'so-field__helper').attributes.id,
		)
	})

	it('ошибка — у контрола: aria-invalid у поля, data-invalid на его корне', () => {
		const body = render(() => (
			<Field label="Почта" error="Нет @" invalid>
				<Input />
			</Field>
		))
		const input = named(body, 'input')

		expect(input.attributes['aria-invalid']).toBe('true')
		expect(input.attributes['aria-describedby']).toBe(
			withClass(body, 'so-field__error').attributes.id,
		)
		expect(withClass(body, 'so-input').attributes['data-invalid']).toBe('true')
	})

	it('группа: ссылка на подпись и справку — у её корня', () => {
		const body = render(() => (
			<Field label="Выбор" helper="Подсказка">
				<RadioGroup>
					<RadioGroup.Item value="a">А</RadioGroup.Item>
				</RadioGroup>
			</Field>
		))
		const group = withClass(body, 'so-radio-group')

		expect(group.attributes['aria-labelledby']).toBe(
			withClass(body, 'so-field__label').attributes.id,
		)
		expect(group.attributes['aria-describedby']).toBe(
			withClass(body, 'so-field__helper').attributes.id,
		)
	})

	/**
	 * Гидратация найдёт те же `id`, если их не придумал счётчик процесса: два
	 * рендера одной разметки дают одни.
	 */
	it('два рендера — одни id поля и частей', () => {
		const ids = (body: string) => [
			named(body, 'input').attributes.id,
			withClass(body, 'so-field__label').attributes.id,
			withClass(body, 'so-field__helper').attributes.id,
		]
		const first = render(email)
		const second = render(email)

		expect(ids(first).every(Boolean)).toBe(true)
		expect(ids(second)).toEqual(ids(first))
	})
})
