/**
 * `<button is="so-button">` в форме — в настоящем браузере.
 *
 * Элемент — нативная `<button>`, расширенная классом soldy (customized
 * built-in): с формой его ведёт браузер, как любую кнопку. Спек сторожит, что
 * так и есть — что адаптер ничего из поведения кнопки не отнял: отправка и
 * сброс по `type`, отмена `click`, `submitter` и `new FormData(form,
 * submitter)`, Enter в поле, `formnovalidate`, `disabled`, `form="id"`,
 * `<label for>`, клавиатура. jsdom форму не отправляет и клика из клавиш не
 * делает, поэтому спек браузерный. Разметку и наборы ядра на кнопке сторожит
 * `ui/webc/__tests__/button.spec.ts`.
 *
 * Обработчик `submit` формы отменяет отправку: иначе форма увела бы рамку
 * теста со страницы.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { userEvent } from 'vitest/browser'

import { TButtonElement, type TButtonElementProps } from '@soldy-ui/webc'
import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Узел разметки теста — снимается после каждого. */
let stage: HTMLElement | null = null

/**
 * Разметка на странице, слушатели плагинов — на кнопке. `TActionPlugin` вешает
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

function isSoldyButton(node: Element | undefined): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** Кнопка soldy разметки теста: первая или с этим `id`. Нет её — тест падает здесь. */
function button(root: ParentNode, id?: string): TButtonElementProps {
	const buttons = Array.from(root.querySelectorAll('button[is="so-button"]'))
	const element = id === undefined ? buttons[0] : buttons.find((item) => item.id === id)

	if (!isSoldyButton(element))
		throw new Error(`<button is="so-button"${id ? ` id="${id}"` : ''}> нет`)

	return element
}

function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const element = root.querySelector(selector)

	if (!(element instanceof type)) throw new Error(`${selector}: узла нет`)

	return element
}

/** Что увидел обработчик `submit`: отправитель и данные формы без него и с ним. */
type TSubmission = { submitter: HTMLElement | null; data: string; withSubmitter: string }

const serialize = (data: FormData) =>
	[...data].map(([name, value]) => `${name}=${String(value)}`).join('&')

/** Отправки формы — с отправителем и данными на момент события. */
function submissions(form: HTMLFormElement): TSubmission[] {
	const seen: TSubmission[] = []

	form.addEventListener('submit', (event) => {
		event.preventDefault()
		seen.push({
			submitter: event.submitter,
			data: serialize(new FormData(form)),
			withSubmitter: serialize(new FormData(form, event.submitter)),
		})
	})

	return seen
}

/** Нажатия кнопки (`so:action:press`) — счётчик. */
function presses(el: Element): { count: number } {
	const counter = { count: 0 }

	el.addEventListener('so:action:press', () => counter.count++)

	return counter
}

describe('<button is="so-button"> в форме · type', () => {
	it('без type клик, Enter и пробел отправляют форму по одному разу, press — тоже', async () => {
		const root = await show('<form><button is="so-button" text="Отправить"></button></form>')
		const el = button(root)
		const pressed = presses(el)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		await userEvent.click(el)
		el.focus()
		await userEvent.keyboard('{Enter}')
		await userEvent.keyboard(' ')

		expect(seen).toHaveLength(3)
		expect(pressed.count).toBe(3)
	})

	it('type="button" не отправляет, type="reset" сбрасывает', async () => {
		const root = await show(`
			<form>
				<input name="q" value="исходное">
				<button is="so-button" id="webc-plain" type="button" text="Кнопка"></button>
				<button is="so-button" id="webc-reset" type="reset" text="Сброс"></button>
			</form>
		`)
		const input = find(root, 'input', HTMLInputElement)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		input.value = 'изменённое'
		await userEvent.click(button(root, 'webc-plain'))

		expect(seen).toEqual([])
		expect(input.value).toBe('изменённое')

		await userEvent.click(button(root, 'webc-reset'))

		expect(input.value).toBe('исходное')
		expect(seen).toEqual([])
	})
})

describe('<button is="so-button"> в форме · отмена клика', () => {
	it.each([
		['на самой кнопке', (root: HTMLElement) => button(root)],
		['на предке', (root: HTMLElement) => root],
	])('preventDefault у click %s отменяет отправку — и мыши, и клавиш', async (_where, of) => {
		const root = await show('<form><button is="so-button" text="Отправить"></button></form>')
		const el = button(root)
		const pressed = presses(el)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		of(root).addEventListener('click', (event) => event.preventDefault())

		await userEvent.click(el)
		el.focus()
		await userEvent.keyboard('{Enter}')
		await userEvent.keyboard(' ')

		expect(seen).toEqual([])
		expect(pressed.count).toBe(3)
	})
})

describe('<button is="so-button"> в форме · submitter, name и value', () => {
	/**
	 * Как у `<button>`: отправитель — нажатая кнопка, её пары нет в
	 * `new FormData(form)` и есть в `new FormData(form, submitter)`. Конструктор
	 * `FormData` принимает отправителем только нативную кнопку отправки — и
	 * принимает, потому что она нативная.
	 */
	it('нажатая кнопка — отправитель, FormData с ней — с её парой', async () => {
		const root = await show(`
			<form>
				<input name="q" value="поиск">
				<button is="so-button" id="webc-save" name="action" value="save" text="Сохранить"></button>
				<button is="so-button" id="webc-drop" name="action" value="drop" text="Удалить"></button>
			</form>
		`)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		await userEvent.click(button(root, 'webc-drop'))

		expect(seen).toEqual([
			{
				submitter: button(root, 'webc-drop'),
				data: 'q=поиск',
				withSubmitter: 'q=поиск&action=drop',
			},
		])
	})

	it('Enter в поле нажимает кнопку по умолчанию — она отправитель', async () => {
		const root = await show(`
			<form>
				<input id="webc-field" name="a"><input name="b">
				<button is="so-button" name="go" value="1" text="Отправить"></button>
			</form>
		`)
		const el = button(root)
		const pressed = presses(el)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		find(root, '#webc-field', HTMLInputElement).focus()
		await userEvent.keyboard('{Enter}')

		expect(seen.map((submission) => submission.submitter)).toEqual([el])
		expect(pressed.count).toBe(1)
	})

	/** `form*`-атрибуты браузер берёт с нажатой кнопки: пустое обязательное поле не держит. */
	it('formnovalidate отправляет форму с пустым обязательным полем', async () => {
		const root = await show(`
			<form>
				<input name="q" required>
				<button is="so-button" id="webc-strict" text="Строго"></button>
				<button is="so-button" id="webc-loose" formnovalidate text="Без проверки"></button>
			</form>
		`)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		await userEvent.click(button(root, 'webc-strict'))

		expect(seen).toEqual([])

		await userEvent.click(button(root, 'webc-loose'))

		expect(seen.map((submission) => submission.submitter)).toEqual([button(root, 'webc-loose')])
	})
})

describe('<button is="so-button"> в форме · disabled и связь с формой', () => {
	/** Клик — `force`: Playwright сам не кликает по выключенному. */
	it('выключенная кнопка не отправляет и фокуса не получает, включённая — отправляет', async () => {
		const root = await show(
			'<form><button is="so-button" disabled text="Отправить"></button></form>',
		)
		const el = button(root)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		await userEvent.click(el, { force: true })

		expect(seen).toEqual([])
		expect(document.activeElement).not.toBe(el)

		el.disabled = false
		await nextFrame()
		await userEvent.click(el)

		expect(seen).toHaveLength(1)
	})

	it('<fieldset disabled> выключает кнопку', async () => {
		const root = await show(
			'<form><fieldset disabled><button is="so-button" text="Отправить"></button></fieldset></form>',
		)
		const el = button(root)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		await userEvent.click(el, { force: true })

		expect(el.matches(':disabled')).toBe(true)
		expect(seen).toEqual([])
	})

	it('form="id" вне формы и клик по <label for> отправляют форму', async () => {
		const root = await show(`
			<form id="webc-outer"></form>
			<label for="webc-send">Подпись</label>
			<button is="so-button" id="webc-send" form="webc-outer" text="Снаружи"></button>
		`)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		await userEvent.click(button(root))
		await userEvent.click(find(root, 'label', HTMLLabelElement))

		expect(seen).toHaveLength(2)
	})
})
