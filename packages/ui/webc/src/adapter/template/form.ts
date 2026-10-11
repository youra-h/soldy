/**
 * Форма — то, что `<button>` делает со своей формой, для элемента, связанного
 * с формой (`formAssociated`).
 *
 * Корень — сам хост (`<so-button>`), а не нативная кнопка, поэтому отправку и
 * сброс браузер за него не сделает. Что делать, решает атрибут `type` хоста,
 * без учёта регистра, как у `<button>` (`submitKind`):
 *
 * - `reset` — сбрасывает форму;
 * - `button` — ничего не делает;
 * - остальное, и атрибута нет, — отправка. Отправка по умолчанию — как у
 *   `<Button>` во Vue и React: там корень — `<button>` без `type`.
 *
 * Два пути, как у нативной кнопки:
 *
 * - `formAction` — нажатие, реакция на `action:press`. Действие ждёт конца
 *   рассылки клика, как действие `<button>`, и отменяется его `preventDefault`
 *   — где бы ни стоял обработчик: на элементе, на предке, добавленный раньше
 *   плагина или позже. Клик из Enter и пробела делает `TActionPlugin`, поэтому
 *   клавиатура отменяется так же;
 * - `implicitSubmission` — неявная отправка: Enter в поле формы нажимает её
 *   кнопку по умолчанию. Браузер ищет её только среди нативных кнопок, и
 *   `<so-button>` ищет себя сам.
 *
 * Отправка — `requestSubmit()`: форма проверяет поля и шлёт `submit`, который
 * можно отменить. Отправителем `requestSubmit` принимает только нативную
 * кнопку, поэтому остальное, что знает о нажатой кнопке форма, элемент отдаёт
 * сам на время отправки: `name` и `value` хоста — в данные формы
 * (`ElementInternals.setFormValue`; `name` форма берёт с атрибута хоста сама),
 * хост — в `submitter` события `submit`. Атрибуты `formaction`, `formmethod`,
 * `formenctype`, `formtarget` и `formnovalidate` не действуют.
 */

import type { ITemplateReactionContext } from './types'

/** Что делает кнопка с формой — по атрибуту `type`, как `<button>`. */
export type TSubmitKind = 'submit' | 'reset' | 'button'

/** Поля, Enter в которых отправляет форму неявно (HTML, «implicit submission»). */
const IMPLICIT_SUBMIT_TYPES: ReadonlySet<string> = new Set([
	'text',
	'search',
	'url',
	'tel',
	'email',
	'password',
	'date',
	'month',
	'week',
	'time',
	'datetime-local',
	'number',
])

/**
 * Хосты, связанные сейчас с формой неявной отправкой: по ним кнопку по
 * умолчанию ищут среди элементов формы рядом с нативными.
 */
const SUBMITTERS = new WeakSet<Element>()

export function submitKind(root: Element): TSubmitKind {
	const type = root.getAttribute('type')?.toLowerCase()

	return type === 'reset' || type === 'button' ? type : 'submit'
}

/** Кнопка отправки — нативная или `<so-button>`, — как её видит форма. */
function isSubmitButton(element: Element): boolean {
	if (element instanceof HTMLButtonElement) return element.type === 'submit'

	if (element instanceof HTMLInputElement) {
		return element.type === 'submit' || element.type === 'image'
	}

	return SUBMITTERS.has(element) && submitKind(element) === 'submit'
}

/**
 * Отправка от имени хоста: его `name` и `value` в данных формы и он сам в
 * `submitter`. `requestSubmit` синхронен — `submit`, данные формы и
 * `formdata` случаются внутри вызова, — поэтому и значение, и подмена живут
 * ровно на время вызова. Подмену ставит окно в фазе перехвата: так
 * `submitter` видят все обработчики `submit`, и на предках формы тоже.
 */
function submit(root: HTMLElement, form: HTMLFormElement, internals: ElementInternals): void {
	const target: EventTarget = form.ownerDocument.defaultView ?? form

	const setSubmitter = (event: Event): void => {
		if (event.target !== form) return

		Object.defineProperty(event, 'submitter', {
			configurable: true,
			enumerable: true,
			value: root,
		})
	}

	target.addEventListener('submit', setSubmitter, { capture: true })
	internals.setFormValue(root.getAttribute('value') ?? '')

	try {
		form.requestSubmit()
	} finally {
		internals.setFormValue(null)
		target.removeEventListener('submit', setSubmitter, { capture: true })
	}
}

/**
 * Нажатие — реакция на `action:press`, аргумент которого — клик. Действие
 * откладывается до конца рассылки клика: так `<button>` проверяет его отмену.
 * Форма читается тогда же, а не в момент клика: элемент мог уйти из неё.
 */
export function formAction({ root, internals, args }: ITemplateReactionContext): void {
	const [click] = args

	if (!internals || !(click instanceof Event)) return

	setTimeout(() => {
		const form = internals.form

		if (!form || click.defaultPrevented) return

		const kind = submitKind(root)

		if (kind === 'reset') {
			form.reset()
		} else if (kind === 'submit') {
			submit(root, form, internals)
		}
	})
}

/**
 * Неявная отправка: Enter в поле формы нажимает её кнопку по умолчанию —
 * первую кнопку отправки в порядке элементов формы. Если это хост, он
 * отменяет действие браузера (тот нажал бы нативную кнопку ниже или отправил
 * форму без кнопки) и нажимает себя: `click()`. Выключенного хоста `click()`
 * не нажимает, и форма не уходит — так и у выключенной нативной кнопки по
 * умолчанию.
 *
 * Слушатель — на документе, а не на форме: поле с атрибутом `form` лежит вне
 * её. Отменённый keydown (`preventDefault` в обработчике поля или формы) и
 * набор через IME форму не отправляют.
 */
export function implicitSubmission(root: HTMLElement, form: HTMLFormElement): () => void {
	const document = root.ownerDocument

	const onKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' || event.defaultPrevented || event.isComposing) return

		const field = event.target

		if (!(field instanceof HTMLInputElement) || field.form !== form) return
		if (!IMPLICIT_SUBMIT_TYPES.has(field.type)) return

		if (Array.from(form.elements).find(isSubmitButton) !== root) return

		event.preventDefault()
		root.click()
	}

	SUBMITTERS.add(root)
	document.addEventListener('keydown', onKeyDown)

	return () => {
		SUBMITTERS.delete(root)
		document.removeEventListener('keydown', onKeyDown)
	}
}
