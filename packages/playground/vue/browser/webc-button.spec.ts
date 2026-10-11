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
 * Действие формы, как у `<button>`, ждёт конца рассылки клика и отменяется его
 * `preventDefault`, поэтому отправка приходит задачей позже клика (`settled`).
 *
 * Обработчик `submit` формы отменяет отправку: иначе форма увела бы рамку
 * теста со страницы.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { userEvent } from 'vitest/browser'

import '@soldy-ui/webc'
import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Действие формы откладывается до конца рассылки клика — задачей. */
const settled = () => new Promise<void>((resolve) => setTimeout(resolve))

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
 * Кнопка разметки теста — с props дескриптора (тип из `HTMLElementTagNameMap`):
 * первая или с этим `id`. Нет её — тест падает здесь, а не на чтении свойства.
 */
function button(root: ParentNode, id?: string): HTMLElementTagNameMap['so-button'] {
	const buttons = Array.from(root.querySelectorAll('so-button'))
	const element = id === undefined ? buttons[0] : buttons.find((item) => item.id === id)

	if (!element) throw new Error(`<so-button${id ? `#${id}` : ''}> нет`)

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

/** Что увидел обработчик `submit`: отправитель и данные формы. */
type TSubmission = { submitter: HTMLElement | null; data: [string, string][] }

/** Отправки формы — с отправителем и данными на момент события. */
function submissions(form: HTMLFormElement): TSubmission[] {
	const seen: TSubmission[] = []

	form.addEventListener('submit', (event) => {
		event.preventDefault()

		const data: [string, string][] = []

		for (const [name, value] of new FormData(form)) data.push([name, String(value)])

		seen.push({ submitter: event.submitter, data })
	})

	return seen
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
		await settled()

		expect(entries).toEqual(['press', 'submit'])

		el.focus()
		await userEvent.keyboard('{Enter}')
		await settled()

		expect(entries).toEqual(['press', 'submit', 'press', 'submit'])

		await userEvent.keyboard(' ')
		await settled()

		expect(entries).toEqual(['press', 'submit', 'press', 'submit', 'press', 'submit'])
	})

	it('type="button" не отправляет', async () => {
		const root = await show('<form><so-button type="button" text="Кнопка"></so-button></form>')
		const el = button(root)
		const entries = journal(el, find(root, 'form', HTMLFormElement))

		await userEvent.click(el)
		el.focus()
		await userEvent.keyboard('{Enter}')
		await settled()

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
		await settled()

		expect(input.value).toBe('исходное')
		expect(entries).toEqual(['press'])
	})
})

describe('<so-button> в форме · отмена клика', () => {
	/**
	 * Как у `<button>`: `preventDefault` у `click` отменяет отправку — где бы ни
	 * стоял обработчик. Слушатель на элементе добавлен после плагина, а
	 * делегирование на предке слушает после хоста: действие формы, сделанное
	 * сразу в слушателе плагина, их отмены не видело.
	 */
	it.each([
		['на самой кнопке', (root: HTMLElement) => button(root)],
		['на предке', (root: HTMLElement) => root],
	])('preventDefault у click %s отменяет отправку — и мыши, и клавиши', async (_where, of) => {
		const root = await show('<form><so-button text="Отправить"></so-button></form>')
		const el = button(root)
		const entries = journal(el, find(root, 'form', HTMLFormElement))

		of(root).addEventListener('click', (event) => event.preventDefault())

		await userEvent.click(el)
		el.focus()
		await userEvent.keyboard('{Enter}')
		await userEvent.keyboard(' ')
		await settled()

		// Нажатия дошли, отправки нет
		expect(entries).toEqual(['press', 'press', 'press'])
	})

	it('preventDefault у click отменяет и сброс', async () => {
		const root = await show(
			'<form><input name="q" value="исходное"><so-button type="reset" text="Сброс"></so-button></form>',
		)
		const el = button(root)
		const input = find(root, 'input', HTMLInputElement)

		el.addEventListener('click', (event) => event.preventDefault())
		input.value = 'изменённое'

		await userEvent.click(el)
		await settled()

		expect(input.value).toBe('изменённое')
	})
})

describe('<so-button> в форме · name, value и submitter', () => {
	/**
	 * Как у `<button>`: пара `name=value` нажатой кнопки — в данных формы, а
	 * событие `submit` знает отправителя. Так различают кнопки одной формы.
	 */
	it('нажатая кнопка — отправитель, её name и value — в данных формы', async () => {
		const root = await show(`
			<form>
				<input name="q" value="поиск">
				<so-button id="webc-save" name="action" value="save" text="Сохранить"></so-button>
				<so-button id="webc-drop" name="action" value="drop" text="Удалить"></so-button>
			</form>
		`)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		await userEvent.click(button(root, 'webc-drop'))
		await settled()

		expect(seen).toEqual([
			{
				submitter: button(root, 'webc-drop'),
				data: [
					['q', 'поиск'],
					['action', 'drop'],
				],
			},
		])
	})

	it('без value — пустое значение, без name — пары нет', async () => {
		const root = await show(`
			<form>
				<so-button id="webc-named" name="go" text="С именем"></so-button>
				<so-button id="webc-plain" text="Без имени"></so-button>
			</form>
		`)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		await userEvent.click(button(root, 'webc-named'))
		await userEvent.click(button(root, 'webc-plain'))
		await settled()

		expect(seen.map((submission) => submission.data)).toEqual([[['go', '']], []])
	})

	/** Пара живёт ровно на время отправки: в данных формы потом её нет. */
	it('после отправки пары кнопки в данных формы нет', async () => {
		const root = await show(
			'<form><so-button name="action" value="save" text="Сохранить"></so-button></form>',
		)
		const form = find(root, 'form', HTMLFormElement)

		submissions(form)

		await userEvent.click(button(root))
		await settled()

		expect([...new FormData(form)]).toEqual([])
	})

	/** Отправителя ставит окно в фазе перехвата — его видит и обработчик предка. */
	it('submitter видит обработчик submit на предке формы', async () => {
		const root = await show('<form><so-button text="Отправить"></so-button></form>')
		const el = button(root)
		const seen: (HTMLElement | null)[] = []

		root.addEventListener('submit', (event) => {
			if (event instanceof SubmitEvent) seen.push(event.submitter)

			event.preventDefault()
		})

		await userEvent.click(el)
		await settled()

		expect(seen).toEqual([el])
	})
})

describe('<so-button> в форме · Enter в поле', () => {
	/**
	 * Неявная отправка: Enter в поле нажимает кнопку формы по умолчанию — первую
	 * кнопку отправки по порядку. Браузер ищет её только среди нативных: при
	 * нескольких полях Enter не делал ничего, при одном форма уходила без
	 * кнопки.
	 */
	it.each([
		['одно поле', '<input id="webc-field" name="a">'],
		['несколько полей', '<input id="webc-field" name="a"><input name="b">'],
	])('%s — Enter нажимает <so-button> и отправляет от её имени', async (_name, fields) => {
		const root = await show(
			`<form>${fields}<so-button name="go" value="1" text="Отправить"></so-button></form>`,
		)
		const el = button(root)
		const presses: string[] = []
		const seen = submissions(find(root, 'form', HTMLFormElement))

		el.addEventListener('action:press', () => presses.push('press'))
		find(root, '#webc-field', HTMLInputElement).focus()
		await userEvent.keyboard('{Enter}')
		await settled()

		expect(presses).toEqual(['press'])
		expect(seen).toHaveLength(1)
		expect(seen[0].submitter).toBe(el)
		expect(seen[0].data).toContainEqual(['go', '1'])
	})

	it('нативная кнопка отправки раньше — нажимается она', async () => {
		const root = await show(`
			<form>
				<input id="webc-field" name="a"><input name="b">
				<button id="webc-native">Нативная</button>
				<so-button text="Своя"></so-button>
			</form>
		`)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		find(root, '#webc-field', HTMLInputElement).focus()
		await userEvent.keyboard('{Enter}')
		await settled()

		expect(seen.map((submission) => submission.submitter)).toEqual([
			find(root, '#webc-native', HTMLButtonElement),
		])
	})

	it('<so-button> раньше нативной — нажимается она', async () => {
		const root = await show(`
			<form>
				<input id="webc-field" name="a"><input name="b">
				<so-button text="Своя"></so-button>
				<button>Нативная</button>
			</form>
		`)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		find(root, '#webc-field', HTMLInputElement).focus()
		await userEvent.keyboard('{Enter}')
		await settled()

		expect(seen.map((submission) => submission.submitter)).toEqual([button(root)])
	})

	/** `type="button"` и `reset` — не кнопки отправки: по умолчанию ищется дальше. */
	it('type="button" кнопкой по умолчанию не бывает', async () => {
		const root = await show(`
			<form>
				<input id="webc-field" name="a"><input name="b">
				<so-button id="webc-plain" type="button" text="Кнопка"></so-button>
				<so-button id="webc-submit" text="Отправить"></so-button>
			</form>
		`)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		find(root, '#webc-field', HTMLInputElement).focus()
		await userEvent.keyboard('{Enter}')
		await settled()

		expect(seen.map((submission) => submission.submitter)).toEqual([
			button(root, 'webc-submit'),
		])
	})

	/** Как у `<button disabled>` по умолчанию: форма не уходит вовсе. */
	it('выключенная кнопка по умолчанию — форма не уходит', async () => {
		const root = await show(
			'<form><input id="webc-field" name="a"><so-button disabled text="Отправить"></so-button></form>',
		)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		find(root, '#webc-field', HTMLInputElement).focus()
		await userEvent.keyboard('{Enter}')
		await settled()

		expect(seen).toEqual([])
	})

	it('Enter в textarea и отменённый Enter форму не отправляют', async () => {
		const root = await show(`
			<form>
				<textarea name="t"></textarea>
				<input id="webc-field" name="a">
				<so-button text="Отправить"></so-button>
			</form>
		`)
		const seen = submissions(find(root, 'form', HTMLFormElement))
		const field = find(root, '#webc-field', HTMLInputElement)

		find(root, 'textarea', HTMLTextAreaElement).focus()
		await userEvent.keyboard('{Enter}')

		field.addEventListener('keydown', (event) => event.preventDefault())
		field.focus()
		await userEvent.keyboard('{Enter}')
		await settled()

		expect(seen).toEqual([])
	})

	it('поле с атрибутом form вне формы — тоже её поле', async () => {
		const root = await show(`
			<form id="webc-outer"><so-button text="Отправить"></so-button></form>
			<input id="webc-field" form="webc-outer" name="a">
			<input form="webc-outer" name="b">
		`)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		find(root, '#webc-field', HTMLInputElement).focus()
		await userEvent.keyboard('{Enter}')
		await settled()

		expect(seen.map((submission) => submission.submitter)).toEqual([button(root)])
	})

	/** Связь с формой снимается вместе с элементом: Enter больше не его. */
	it('после удаления кнопки Enter её не нажимает', async () => {
		const root = await show(
			'<form><input id="webc-field" name="a"><input name="b"><so-button text="Отправить"></so-button></form>',
		)
		const seen = submissions(find(root, 'form', HTMLFormElement))

		button(root).remove()
		find(root, '#webc-field', HTMLInputElement).focus()
		await userEvent.keyboard('{Enter}')
		await settled()

		expect(seen).toEqual([])
	})
})

describe('<so-button> в форме · свойства формы', () => {
	/** Те же свойства, что у `<button>`. */
	it('form, labels, name, value и type — как у <button>', async () => {
		const root = await show(`
			<form id="webc-form">
				<label for="webc-send">Подпись</label>
				<so-button id="webc-send" name="n" value="v" type="RESET" text="Отправить"></so-button>
			</form>
		`)
		const el = button(root)

		expect(el.form).toBe(find(root, 'form', HTMLFormElement))
		expect(Array.from(el.labels ?? [])).toEqual([find(root, 'label', HTMLLabelElement)])
		expect([el.name, el.value, el.type]).toEqual(['n', 'v', 'reset'])

		el.type = 'нечто'
		el.name = 'm'
		el.value = 'w'

		expect([el.type, el.getAttribute('name'), el.getAttribute('value')]).toEqual([
			'submit',
			'm',
			'w',
		])
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
		await settled()

		expect(entries).toEqual([])
		expect(document.activeElement).not.toBe(el)

		el.disabled = false
		await nextFrame()

		expect(el.hasAttribute('disabled')).toBe(false)

		await userEvent.click(el)
		await settled()

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
		await settled()

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
		await settled()

		expect(entries).toEqual(['press', 'submit'])
	})
})
