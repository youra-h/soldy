/**
 * Клик по строке ListBox выбирает через расширение списка
 * (`adapters.list.choose()`), а не через `selection.toggle()`.
 *
 * `TSelectionExtension.toggle` выключенность не проверяет — выбрать
 * выключенный элемент из кода остаётся правом приложения, — и клик по строке
 * выключенного элемента его выбирал. В теме oren мышь до такой строки не
 * доходит (`pointer-events-none`), но клик от скринридера или скрипта
 * проходил. Отказывает выключенному `TListBoxExtension.chooseItem` — тот же
 * путь, что у Enter и пробела (`TListKeyboardPlugin`).
 *
 * Выбор висит на `click`, а не на `action:press`, поэтому кадра для
 * слушателей `TActionPlugin` тесту ждать не нужно.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ListBox, ListBoxItem } from '@soldy/ui-vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Строка элемента — на ней обработчик выбора и `aria-selected`. */
const rows = () => [...document.querySelectorAll('.s-list-box-item .s-button')]

/** Строка элемента по тексту; нет её — тест падает здесь. */
const rowOf = (text: string): HTMLElement => {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!(row instanceof HTMLElement)) throw new Error(`строки элемента «${text}» нет`)

	return row
}

/** `aria-selected` всех строк по порядку. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

/** «B» выключается пропом `itemOff`, весь список — пропом `listOff`. */
const Harness = {
	components: { ListBox, ListBoxItem },
	props: { itemOff: Boolean, listOff: Boolean },
	template: `
		<ListBox mode="multiple" :disabled="listOff">
			<ListBoxItem value="a" text="A" />
			<ListBoxItem value="b" text="B" :disabled="itemOff" />
		</ListBox>
	`,
}

type THarnessProps = { itemOff?: boolean; listOff?: boolean }

describe('клик по строке переключает выбор', () => {
	it('выбирает элемент, повторный клик снимает выбор', async () => {
		wrapper = mount(Harness, { attachTo: document.body })
		await nextTick()

		rowOf('B').click()
		await nextTick()

		expect(selection()).toEqual(['false', 'true'])

		rowOf('B').click()
		await nextTick()

		expect(selection()).toEqual(['false', 'false'])
	})
})

/**
 * Выключенный элемент кликом не выбирается — выключен ли он сам или весь
 * список. Включённый обратно — выбирается тем же кликом: так видно, что
 * обработчик на месте и отказ даёт именно выключенность.
 */
describe('выключенный элемент кликом не выбирается', () => {
	/** Как выключить и как включить обратно. */
	const WAYS: ReadonlyArray<readonly [string, THarnessProps, THarnessProps]> = [
		['выключен сам', { itemOff: true }, { itemOff: false }],
		['выключен список', { listOff: true }, { listOff: false }],
	]

	it.each(WAYS)('%s: клик не выбирает, после включения — выбирает', async (_way, off, on) => {
		const mounted = mount(Harness, { props: off, attachTo: document.body })

		wrapper = mounted
		await nextTick()

		expect(rowOf('B').dataset.disabled).toBe('true')

		rowOf('B').click()
		await nextTick()

		expect(selection()).toEqual(['false', 'false'])

		await mounted.setProps(on)

		rowOf('B').click()
		await nextTick()

		expect(selection()).toEqual(['false', 'true'])
	})
})
