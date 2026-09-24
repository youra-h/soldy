/**
 * THideOutsidePlugin во Vue — фон модального слоя на настоящей разметке.
 *
 * Модальным слоем служит `Frame`, которому плагин поставлен снаружи, из
 * `@bundle:create`, с открытостью по `visible`: так плагин проверяется один,
 * без остальных плагинов модального окна (окно целиком — `dialog.spec.ts`).
 * Внутри слоя — `Select`. Его список телепортирован в `body` соседом окна, а
 * пока закрыт, лежит там без номера слоя выше окна: слой пишет номер только
 * при показе. Здесь проверяется то, ради чего плагин пересчитывает пометки, а
 * не снимает их при открытии: открытый список получает номер выше окна и
 * остаётся доступным скринридеру.
 *
 * Правила пометки по отдельности — `plugins/__tests__/hide-outside.plugin.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { Frame, Select, SelectItem } from '@soldy-ui/vue'
import { THideOutsidePlugin, TPluginBundle } from '@soldy-ui/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Плагин ставится так, как его поставит модальное окно: открытость — `visible`. */
const hideOutside = (bundle: unknown) => {
	if (bundle instanceof TPluginBundle) bundle.use(THideOutsidePlugin, { property: 'visible' })
}

/**
 * Страница и модальное окно с Select внутри. Отдаёт открытость окна: оно
 * смонтировано скрытым, как всякий `Frame`.
 */
async function render(): Promise<Ref<boolean>> {
	const shown = ref(false)

	wrapper = mount(
		defineComponent({
			render: () =>
				h('div', [
					h('button', { class: 's-test-page' }, 'Страница'),
					h(
						Frame,
						{
							class: 's-test-dialog',
							visible: shown.value,
							'onBundle:create': hideOutside,
						},
						() => [
							h(Select, { class: 's-test-select' }, () => [
								h(SelectItem, { key: 'a', value: 'a', text: 'Первый' }),
								h(SelectItem, { key: 'b', value: 'b', text: 'Второй' }),
							]),
						],
					),
				]),
		}),
		{ attachTo: document.body },
	)

	await settle()

	return shown
}

/** Рендер, наблюдатель плагина на микрозадаче и кадр — корень плагины получают через него. */
async function settle(): Promise<void> {
	await nextTick()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Спрятан ли узел от скринридера — сам или через предка. */
const muted = (node: Element) => node.closest('[aria-hidden="true"]') !== null

/** Кто в документе несёт `aria-hidden` и с каким значением — чтобы сравнить «до» и «после». */
const ariaHiddenNodes = () =>
	new Map(
		[...document.querySelectorAll('[aria-hidden]')].map((node) => [
			node,
			node.getAttribute('aria-hidden'),
		]),
	)

const field = () => find('.s-test-select input')
const list = () => find('.s-select__panel')

describe('модальный слой с Select внутри', () => {
	it('окно показано — страница под aria-hidden, окно и его содержимое доступны', async () => {
		const shown = await render()

		shown.value = true
		await settle()

		expect(muted(find('.s-test-page'))).toBe(true)
		expect(muted(find('.s-test-dialog'))).toBe(false)
		expect(muted(field())).toBe(false)
	})

	it('закрытый список Select спрятан, открытый — доступен', async () => {
		const shown = await render()

		shown.value = true
		await settle()

		// Список смонтирован и скрыт, номера слоя выше окна у него ещё нет
		expect(muted(list())).toBe(true)

		field().click()
		await settle()

		expect(field().getAttribute('aria-expanded')).toBe('true')
		expect(muted(list())).toBe(false)
		expect(muted(find('.s-select__panel [role="option"]'))).toBe(false)
	})

	it('окно скрыто — всё как было, в том числе чужие aria-hidden', async () => {
		const shown = await render()
		const before = ariaHiddenNodes()

		shown.value = true
		await settle()

		field().click()
		await settle()

		shown.value = false
		await settle()

		expect(ariaHiddenNodes()).toEqual(before)
		expect(muted(find('.s-test-page'))).toBe(false)
		expect(muted(list())).toBe(false)
	})
})
