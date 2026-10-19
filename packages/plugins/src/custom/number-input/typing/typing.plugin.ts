import type { INumberInput } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IDomEventTarget } from '../../../utils'
import { isInputOf } from '../parts'
import type { TNumberInputTypingPluginEvents } from './types'

/**
 * Правки, которые идут мимо проверки: отмена и повтор возвращают текст,
 * который поле уже приняло, а перевод строки — Enter, неявная отправка формы,
 * — текста не меняет.
 */
const PASS: ReadonlySet<string> = new Set([
	'historyUndo',
	'historyRedo',
	'insertLineBreak',
	'insertParagraph',
])

/** Единиц UTF-16 у знака перед `index`: цифра вне BMP — две. */
function unitsBefore(text: string, index: number): number {
	const code = text.charCodeAt(index - 1)

	return code >= 0xdc00 && code <= 0xdfff && index > 1 ? 2 : 1
}

/** Единиц UTF-16 у знака с `index`: цифра вне BMP — две. */
function unitsAfter(text: string, index: number): number {
	const code = text.charCodeAt(index)

	return code >= 0xd800 && code <= 0xdbff ? 2 : 1
}

/**
 * Текст поля, если правку пропустить: по типу правки и выделению. Вставка
 * встаёт вместо выделения; удаление снимает выделение, а без него — знак у
 * каретки. Чего по правке не предсказать (удаление слова), — `undefined`:
 * итог проверит `input`.
 */
function nextText(input: HTMLInputElement, event: InputEvent): string | undefined {
	const { value } = input
	const start = input.selectionStart ?? value.length
	const end = input.selectionEnd ?? start
	const type = event.inputType

	if (type.startsWith('insert')) {
		const data = event.data ?? event.dataTransfer?.getData('text/plain') ?? null

		return data === null ? undefined : value.slice(0, start) + data + value.slice(end)
	}

	if (!type.startsWith('delete')) return undefined
	if (start !== end) return value.slice(0, start) + value.slice(end)

	if (type === 'deleteContentBackward') {
		return start === 0
			? value
			: value.slice(0, start - unitsBefore(value, start)) + value.slice(end)
	}

	if (type === 'deleteContentForward') {
		return value.slice(0, start) + value.slice(end + unitsAfter(value, end))
	}

	return undefined
}

/**
 * TNumberInputTypingPlugin — набор в поле числа: что набирается, решает ядро.
 *
 * **До правки** (`beforeinput`) плагин считает, каким станет текст, — по типу
 * правки и выделению, — и спрашивает ядро, годится ли он (`acceptsText`): не
 * годится — правка гасится, и ни текст, ни каретка не сдвигаются. Так буква,
 * второй разделитель или минус у поля без отрицательных не встают в поле даже
 * на миг. Отмена, повтор и перевод строки (Enter отправляет форму) идут мимо.
 *
 * **После правки** (`input`) текст поля уходит ядру (`typeText`): пока он
 * число, ядро пишет значение. Ядро отказало или показывает другое — запись
 * отменили в `change:value:before`, правку браузер сделал мимо `beforeinput`,
 * — узел получает текст ядра обратно: фреймворк его не перерисует, если текст
 * ядра не сменился. Композицию (IME, клавиатуры Android) не погасить: её
 * текст поле показывает, пока она идёт, а ядру он уходит на `compositionend`.
 *
 * **Уход фокуса** с ввода закрывает набор: `commit()` — значение с точностью
 * формата, текст строкой формата.
 *
 * Слушает корень, а берёт только правки самого ввода: у содержимого слотов
 * свой текст.
 */
export class TNumberInputTypingPlugin extends TBasePlugin<
	INumberInput,
	TNumberInputTypingPluginEvents
> {
	private _owner: INumberInput | null = null
	private _root: Element | null = null
	/** Идёт композиция: её текст уйдёт ядру на `compositionend` */
	private _composing = false

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<INumberInput>() ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._bind(element))
		elementPlugin?.events.on('removed', () => this._bind(null))
	}

	override destroy(): void {
		this._bind(null)
		this._owner = null

		super.destroy()
	}

	/** Корень сменился — слушатели переезжают. */
	private _bind(root: Element | null): void {
		const previous: IDomEventTarget | null = this._root

		previous?.removeEventListener('beforeinput', this._onBeforeInput)
		previous?.removeEventListener('input', this._onInput)
		previous?.removeEventListener('compositionstart', this._onCompositionStart)
		previous?.removeEventListener('compositionend', this._onCompositionEnd)
		previous?.removeEventListener('focusout', this._onFocusOut)

		this._root = root
		this._composing = false

		const target: IDomEventTarget | null = root

		target?.addEventListener('beforeinput', this._onBeforeInput)
		target?.addEventListener('input', this._onInput)
		target?.addEventListener('compositionstart', this._onCompositionStart)
		target?.addEventListener('compositionend', this._onCompositionEnd)
		target?.addEventListener('focusout', this._onFocusOut)
	}

	/** Правка, текст которой ядро не возьмёт, гасится: поле его не показывает. */
	private readonly _onBeforeInput = (event: InputEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || event.defaultPrevented || !isInputOf(owner, root, event.target))
			return

		// Композицию не погасить: её текст ядро получит на `compositionend`
		if (event.isComposing || event.inputType === 'insertCompositionText') return
		if (PASS.has(event.inputType)) return

		const next = nextText(event.target, event)

		if (next !== undefined && !owner.acceptsText(next)) event.preventDefault()
	}

	/** Текст поля — ядру; пока идёт композиция, её вернёт `compositionend`. */
	private readonly _onInput = (event: Event): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || this._composing || !isInputOf(owner, root, event.target)) return

		typeText(owner, event.target)
	}

	private readonly _onCompositionStart = (): void => {
		this._composing = true
	}

	private readonly _onCompositionEnd = (event: CompositionEvent): void => {
		this._composing = false

		const owner = this._owner
		const root = this._root

		if (owner && root && isInputOf(owner, root, event.target)) typeText(owner, event.target)
	}

	/**
	 * Фокус ушёл с ввода — набор закончен. Текст формата, который поставит
	 * `commit()`, фреймворк напишет сам: узел до него показывал текст ядра.
	 */
	private readonly _onFocusOut = (event: FocusEvent): void => {
		const owner = this._owner
		const root = this._root

		if (owner && root && isInputOf(owner, root, event.target)) owner.commit()
	}
}

/**
 * Текст узла — ядру. Показывает узел не то, что приняло ядро, — отказ или
 * поправленная запись, — узел получает текст ядра: фреймворк перерисует его,
 * только если текст ядра сменился. Запись того же текста сбросила бы каретку,
 * поэтому — только при расхождении.
 */
function typeText(owner: INumberInput, input: HTMLInputElement): void {
	owner.typeText(input.value)

	if (input.value !== owner.text) input.value = owner.text
}
