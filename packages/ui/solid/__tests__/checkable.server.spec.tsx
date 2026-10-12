/**
 * CheckBox и Switch на сервере: отметку, которую в браузере Solid пишет
 * свойством узла, сервер отдаёт атрибутом `checked` — поле отмечено с первой
 * отрисовки, ещё до гидратации. «Выбрано частично» — только свойство узла:
 * атрибута у HTML нет, и в разметку оно не уходит.
 */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'solid-js/web'
import { CheckBox, Switch } from '@soldy-ui/solid'

/** Открывающий тег поля в серверной разметке, без меток гидратации. */
function fieldOf(body: string): string {
	const tag = /<input\s[^>]*>/.exec(body.replace(/<!--[\s\S]*?-->/g, ''))

	if (!tag) throw new Error(`в разметке нет поля: ${body}`)

	return tag[0]
}

const CHECKABLES = [
	['CheckBox', (value: boolean) => renderToString(() => <CheckBox value={value} />)],
	['Switch', (value: boolean) => renderToString(() => <Switch value={value} />)],
] as const

describe.each(CHECKABLES)('%s · серверный рендер', (_name, draw) => {
	it.each([true, false])('value: %s — атрибут checked в разметке', (value) => {
		expect(/\schecked/.test(fieldOf(draw(value)))).toBe(value)
	})
})

describe('CheckBox · серверный рендер', () => {
	it('выбранный — отметка в коробке с первой отрисовки', () => {
		const body = renderToString(() => <CheckBox value />)

		expect(body).toMatch(/<svg [^>]*class="s-check-box__mark ?"/)
	})

	it('частично выбранный — без атрибута indeterminate: у HTML его нет', () => {
		const body = renderToString(() => <CheckBox indeterminate />)

		expect(fieldOf(body)).not.toContain('indeterminate')
		expect(body).toMatch(/<svg [^>]*class="s-check-box__mark ?"/)
	})
})
