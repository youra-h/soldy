/**
 * `<so-button>` в форме — в настоящем браузере.
 *
 * Корень Button в Web Components — сам хост, связанный с формой
 * (form-associated custom element). Форму он отправляет и сбрасывает реакцией
 * на `press` (`formAction` в шаблоне) по атрибуту `type`, как `<button>`, а
 * нативный `disabled` выключает его так же, как нативную кнопку: без кликов и
 * без фокуса. jsdom этого не умеет — у его `ElementInternals` нет `form`, —
 * поэтому спек браузерный. Разметку и наборы ядра на хосте сторожит
 * `ui/webc/__tests__/button.spec.ts`.
 *
 * Обработчик `submit` формы отменяет отправку: иначе форма увела бы рамку
 * теста со страницы.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { userEvent } from 'vitest/browser'

import '@soldy-ui/webc'
import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Узел разметки теста — снимается после каждого. */
let stage: HTMLElement | null = null

/**
 * Разметка на странице, слушатели плагинов — на хосте. `TActionPlugin` вешает
 * их по `ready` узла, а `TElementPlugin` объявляет узел через кадр после
 * привязки: клик раньше прошёл бы мимо плагина.
 */
async function show(html: string): Promise<HTMLElement> {
	const node = document.createElement('div')

	node.innerHTML = html
	document.body.appendChild(node)
	stage = node

	await nextFrame()
	await nextFrame()

	return node
}

afterEach(() => {
	stage?.remove()
	stage = null
})

/**
 * Кнопка разметки теста — с props дескриптора (тип из `HTMLElementTagNameMap`);
 * нет её — тест падает здесь, а не на чтении свойства.
 */
function button(root: ParentNode): HTMLElementTagNameMap['so-button'] {
	const element = root.querySelector('so-button')

	if (!element) throw new Error('<so-button> нет')

	return element
}

function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const element = root.querySelector(selector)

	if (!(element instanceof type)) throw new Error(`${selector}: узла нет`)

	return element
}

/**
 * Журнал: нажатия кнопки и отправки формы по порядку. Отправка отменяется —
 * иначе рамка теста ушла бы со страницы.
 */
function journal(el: Element, form: HTMLFormElement): string[] {
	const entries: string[] = []

	el.addEventListener('action:press', () => entries.push('press'))
	form.addEventListener('submit', (event) => {
		event.preventDefault()
		entries.push('submit')
	})

	return entries
}

describe('<so-button> в форме · type', () => {
	/**
	 * Отправка по умолчанию — как у `<Button>` во Vue и React. Сначала событие
	 * уходит потребителю, потом действие формы.
	 */
	it('без type клик, Enter и пробел отправляют форму по одному разу', async () => {
		const root = await show('<form><so-button text="Отправить"></so-button></form>')
		const el = button(root)
		const entries = journal(el, find(root, 'form', HTMLFormElement))

		await userEvent.click(el)

		expect(entries).toEqual(['press', 'submit'])

		el.focus()
		await userEvent.keyboard('{Enter}')

		expect(entries).toEqual(['press', 'submit', 'press', 'submit'])

		await userEvent.keyboard(' ')

		expect(entries).toEqual(['press', 'submit', 'press', 'submit', 'press', 'submit'])
	})

	it('type="button" не отправляет', async () => {
		const root = await show('<form><so-button type="button" text="Кнопка"></so-button></form>')
		const el = button(root)
		const entries = journal(el, find(root, 'form', HTMLFormElement))

		await userEvent.click(el)
		el.focus()
		await userEvent.keyboard('{Enter}')

		// Нажатия дошли — отправки нет
		expect(entries).toEqual(['press', 'press'])
	})

	/** `type` — без учёта регистра, как у `<button>`. */
	it('type="RESET" сбрасывает поле и не отправляет', async () => {
		const root = await show(
			'<form><input name="q" value="исходное"><so-button type="RESET" text="Сброс"></so-button></form>',
		)
		const el = button(root)
		const input = find(root, 'input', HTMLInputElement)
		const entries = journal(el, find(root, 'form', HTMLFormElement))

		input.value = 'изменённое'

		await userEvent.click(el)

		expect(input.value).toBe('исходное')
		expect(entries).toEqual(['press'])
	})
})

describe('<so-button> в форме · disabled', () => {
	/**
	 * Нативный `disabled` у элемента, связанного с формой, — настоящее
	 * выключение: браузер не отдаёт ему кликов и не ставит на него фокус. Клик —
	 * `force`: Playwright сам не кликает по выключенному.
	 */
	it('выключенная кнопка не отправляет и фокуса не получает, включённая — отправляет', async () => {
		const root = await show('<form><so-button disabled text="Отправить"></so-button></form>')
		const el = button(root)
		const entries = journal(el, find(root, 'form', HTMLFormElement))

		expect(el.matches(':disabled')).toBe(true)

		await userEvent.click(el, { force: true })

		expect(entries).toEqual([])
		expect(document.activeElement).not.toBe(el)

		el.disabled = false
		await nextFrame()

		expect(el.hasAttribute('disabled')).toBe(false)

		await userEvent.click(el)

		expect(entries).toEqual(['press', 'submit'])
	})
})

describe('<so-button> в форме · связь с формой', () => {
	it('form="id" вне формы отправляет эту форму', async () => {
		const root = await show(
			'<form id="webc-outer"></form><so-button form="webc-outer" text="Снаружи"></so-button>',
		)
		const el = button(root)
		const entries = journal(el, find(root, 'form', HTMLFormElement))

		await userEvent.click(el)

		expect(entries).toEqual(['press', 'submit'])
	})

	/** Элемент, связанный с формой, — помечаемый: клик по подписи доходит до него. */
	it('клик по <label for> отправляет форму', async () => {
		const root = await show(
			'<form><label for="webc-send">Подпись</label><so-button id="webc-send" text="Отправить"></so-button></form>',
		)
		const el = button(root)
		const entries = journal(el, find(root, 'form', HTMLFormElement))

		await userEvent.click(find(root, 'label', HTMLLabelElement))

		expect(entries).toEqual(['press', 'submit'])
	})
})
