/**
 * THideOutsidePlugin в Web Components — фон модального слоя на настоящей
 * разметке.
 *
 * Модальным слоем служит `<div is="so-frame">`, которому плагин поставлен
 * снаружи, из `so:bundle:create`, с открытостью по `visible`: так плагин
 * проверяется один, без остальных плагинов модального окна. Внутри слоя —
 * поповер. Его панель уехала в `body` соседкой окна, а пока закрыта, лежит
 * там без номера слоя выше окна: слой пишет номер только при показе. Здесь
 * проверяется то, ради чего плагин пересчитывает пометки, а не снимает их при
 * открытии: открытая панель получает номер выше окна и остаётся доступной
 * скринридеру. Сценарии — те же, что у Svelte (`hide-outside.spec.ts`), с
 * поповером; Select у Web Components ещё нет.
 *
 * Правила пометки по отдельности — `plugins/__tests__/hide-outside.plugin.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { THideOutsidePlugin, TPluginBundle } from '@soldy-ui/plugins'
import { TFrameElement, type TFrameElementProps } from '@soldy-ui/webc'

/** Отрисовка и наблюдатель плагина — на микрозадаче. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isFrame(node: Element | null): node is TFrameElementProps {
	return node instanceof TFrameElement
}

/** Отрисовка, наблюдатель плагина на микрозадаче и кадр — корень плагины получают через него. */
async function settle(): Promise<void> {
	await flush()
	await nextFrame()
}

/**
 * Страница и модальный слой с поповером внутри. Отдаёт слой: смонтирован он
 * скрытым, как всякий Frame. Плагин ставится так, как его поставит модальное
 * окно, — из `so:bundle:create`, открытость — `visible`, — и только самому
 * слою: событие элемента потребителя всплывает, и до слушателя слоя доходят
 * сборки поповера и его триггера.
 */
async function render(): Promise<TFrameElementProps> {
	const page = document.createElement('div')

	page.innerHTML = `<button class="so-test-page">Страница</button>
		<div is="so-frame" class="so-test-dialog">
			<span is="so-popover">
				<button is="so-button" slot="trigger" class="so-test-trigger" text="Ещё"></button>
				<button class="so-test-inside">Внутри</button>
			</span>
		</div>`

	const dialog = page.querySelector('.so-test-dialog')

	if (!isFrame(dialog)) throw new Error('<div is="so-frame"> нет')

	dialog.addEventListener('so:bundle:create', (event) => {
		if (event.target !== dialog) return

		if (event instanceof CustomEvent && event.detail instanceof TPluginBundle) {
			event.detail.use(THideOutsidePlugin, { property: 'visible' })
		}
	})

	document.body.appendChild(page)
	await settle()

	return dialog
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function node(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

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
		const dialog = await render()

		dialog.visible = true
		await settle()

		expect(muted(node('.so-test-page'))).toBe(true)
		expect(muted(dialog)).toBe(false)
		expect(muted(trigger())).toBe(false)
	})

	it('закрытая панель поповера спрятана, открытая — доступна', async () => {
		const dialog = await render()

		dialog.visible = true
		await settle()

		// Панель уехала в `body` скрытой, номера слоя выше окна у неё ещё нет
		expect(panel().parentElement).toBe(document.body)
		expect(muted(panel())).toBe(true)

		await openPopover()

		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		expect(muted(panel())).toBe(false)
		expect(muted(node('.so-test-inside'))).toBe(false)
	})

	it('слой скрыт — всё как было, в том числе чужие aria-hidden', async () => {
		const dialog = await render()
		const before = ariaHiddenNodes()

		dialog.visible = true
		await settle()

		await openPopover()

		dialog.visible = false
		await settle()

		expect(ariaHiddenNodes()).toEqual(before)
		expect(muted(node('.so-test-page'))).toBe(false)
		expect(muted(panel())).toBe(false)
	})
})
