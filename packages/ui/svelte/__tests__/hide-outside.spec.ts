/**
 * THideOutsidePlugin в Svelte — фон модального слоя на настоящей разметке.
 *
 * Модальным слоем служит `Frame`, которому плагин поставлен снаружи, из
 * `onBundleCreate`, с открытостью по `visible`: так плагин проверяется один,
 * без остальных плагинов модального окна (окно целиком — `dialog.spec.ts`).
 * Внутри слоя — поповер. Его панель телепортирована в `body` соседом окна, а
 * пока закрыта, лежит там без номера слоя выше окна: слой пишет номер только
 * при показе. Здесь проверяется то, ради чего плагин пересчитывает пометки, а
 * не снимает их при открытии: открытая панель получает номер выше окна и
 * остаётся доступной скринридеру.
 *
 * У Vue (`hide-outside.spec.ts`) внутри слоя — Select: его список — такая же
 * панель в `body`. Select в Svelte ещё нет, и правило проверяется на поповере.
 *
 * Правила пометки по отдельности — `plugins/__tests__/hide-outside.plugin.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import Harness from './HideOutside.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/**
 * Страница и модальный слой с поповером внутри. Отдаёт пропсы обёртки:
 * открытость слоя (`shown`) — смонтирован он скрытым, как всякий `Frame`.
 */
async function render(): Promise<{ shown?: boolean }> {
	const props = reactiveProps<{ shown?: boolean }>({ shown: false })

	mount(Harness, props)
	await settle()

	return props
}

/** Отрисовка, наблюдатель плагина на микрозадаче и кадр — корень плагины получают через него. */
async function settle(): Promise<void> {
	flushSync()
	await nextFrame()
}

const node = (selector: string) => find(document, selector, HTMLElement)

/** Спрятан ли узел от скринридера — сам или через предка. */
const muted = (element: Element) => element.closest('[aria-hidden="true"]') !== null

/** Кто в документе несёт `aria-hidden` и с каким значением — чтобы сравнить «до» и «после». */
const ariaHiddenNodes = () =>
	new Map(
		[...document.querySelectorAll('[aria-hidden]')].map((element) => [
			element,
			element.getAttribute('aria-hidden'),
		]),
	)

const trigger = () => node('.so-test-trigger')
const panel = () => node('.so-popover__panel')

/** Открыть поповер кликом по триггеру. */
async function openPopover(): Promise<void> {
	trigger().click()
	await settle()
}

describe('модальный слой с поповером внутри', () => {
	it('слой показан — страница под aria-hidden, слой и его содержимое доступны', async () => {
		const props = await render()

		props.shown = true
		await settle()

		expect(muted(node('.so-test-page'))).toBe(true)
		expect(muted(node('.so-test-dialog'))).toBe(false)
		expect(muted(trigger())).toBe(false)
	})

	it('закрытая панель поповера спрятана, открытая — доступна', async () => {
		const props = await render()

		props.shown = true
		await settle()

		// Панель смонтирована и скрыта, номера слоя выше окна у неё ещё нет
		expect(muted(panel())).toBe(true)

		await openPopover()

		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		expect(muted(panel())).toBe(false)
		expect(muted(node('.so-test-inside'))).toBe(false)
	})

	it('слой скрыт — всё как было, в том числе чужие aria-hidden', async () => {
		const props = await render()
		const before = ariaHiddenNodes()

		props.shown = true
		await settle()

		await openPopover()

		props.shown = false
		await settle()

		expect(ariaHiddenNodes()).toEqual(before)
		expect(muted(node('.so-test-page'))).toBe(false)
		expect(muted(panel())).toBe(false)
	})
})
