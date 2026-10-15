/**
 * CheckBox и Switch на сервере: отметку, которую в браузере Svelte пишет
 * свойством узла, сервер отдаёт атрибутом `checked` — поле отмечено с первой
 * отрисовки, ещё до гидратации.
 */

import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import { CheckBox, Switch } from '@soldy-ui/svelte'

/** Открывающий тег поля в серверной разметке, без меток гидратации. */
function fieldOf(body: string): string {
	const tag = /<input\s[^>]*>/.exec(body.replace(/<!--[\s\S]*?-->/g, ''))

	if (!tag) throw new Error(`в разметке нет поля: ${body}`)

	return tag[0]
}

const CHECKABLES = [
	['CheckBox', (value: boolean) => render(CheckBox, { props: { value } }).body],
	['Switch', (value: boolean) => render(Switch, { props: { value } }).body],
] as const

describe.each(CHECKABLES)('%s · серверный рендер', (_name, draw) => {
	it.each([true, false])('value: %s — атрибут checked в разметке', (value) => {
		expect(/\schecked/.test(fieldOf(draw(value)))).toBe(value)
	})
})

describe('CheckBox · серверный рендер', () => {
	it('выбранный — отметка в коробке с первой отрисовки', () => {
		const body = render(CheckBox, { props: { value: true } }).body

		expect(body).toMatch(/<svg [^>]*class="so-check-box__mark"/)
	})
})
