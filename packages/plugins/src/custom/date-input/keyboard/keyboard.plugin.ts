import type { IDateInput, TDateFieldPart } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { isFocusableElement } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import {
	collapseRowSelection,
	rowOf,
	rowSelection,
	segmentElementOf,
	segmentOf,
	segmentsOf,
	selectRow,
	touchedSegments,
} from '../parts'
import type { TDateInputKeyCommand, TDateInputKeyboardPluginEvents } from './types'

/**
 * Клавиши части под фокусом — команды ядра. ←/→ идут к соседней части по
 * направлению ряда, а не страницы: у `ar-EG` дата пишется справа налево, и →
 * ведёт к части, что стоит правее, — к предыдущей по формату.
 */
const COMMANDS: Readonly<Record<string, TDateInputKeyCommand>> = {
	ArrowUp: (owner) => owner.shiftSegment(1),
	ArrowDown: (owner) => owner.shiftSegment(-1),
	Home: (owner) => owner.moveSegmentToEdge('start'),
	End: (owner) => owner.moveSegmentToEdge('end'),
	ArrowLeft: (owner) => owner.shiftFocus(owner.segmentsDirection === 'rtl' ? 1 : -1),
	ArrowRight: (owner) => owner.shiftFocus(owner.segmentsDirection === 'rtl' ? -1 : 1),
	Backspace: (owner) => owner.eraseDigit(),
	Delete: (owner) => owner.clearSegment(),
	// Пробел у части ничего не делает, но без этого прокрутил бы страницу, как
	// у любого нередактируемого узла
	' ': () => {},
}

/** Клавиши, которые стирают выделенные части целиком. */
const ERASE_KEYS: ReadonlySet<string> = new Set(['Backspace', 'Delete'])

/**
 * TDateInputKeyboardPlugin — клавиатура поля даты и DOM-фокус, который идёт
 * за частью под фокусом ядра.
 *
 * Части нередактируемые: браузер текст сам не правит и `beforeinput` не шлёт,
 * а всё, что делает клавиша, — команда ядра. Клавиши берутся только с самой
 * части: у содержимого слотов (кнопки календаря) свои клавиши. Обработанная
 * клавиша гасится `preventDefault`.
 *
 * - **Цифра** — набор в часть (`typeKey`); цифры ASCII, локали и
 *   полноширинные различает ядро. Во время композиции IME клавиша не наша.
 * - **Буква** у периода суток — тот же `typeKey`: какой период она выбирает,
 *   решает ядро по именам периодов локали.
 * - **↑/↓, Home/End** — число части (у периода суток — другой период),
 *   **Backspace** — стереть цифру (с пустой части — фокус на предыдущую),
 *   **Delete** — очистить часть, **←/→** — соседняя часть по направлению ряда.
 * - **Ctrl/Cmd+A** — выделение браузера на весь ряд, по `code`, а не `key`:
 *   на русской раскладке `key` — «ф». Фокус остаётся на части, копирует и
 *   вырезает выделенное плагин буфера обмена.
 * - **Выделение задело части** — Delete и Backspace их очищают, цифра
 *   очищает и набирается в первую (`replaceSegments`). Выделение браузер у
 *   нередактируемого текста сам не снимает, поэтому клавишу, которую поле
 *   обработало, плагин снимает с ним вместе.
 *
 * **Фокус.** `focusin` на части сообщает ядру часть, `focusout` из ряда —
 * что фокуса в поле нет. Обратно — `change:focusedSegment`: ядро перевело
 * фокус (набрали число до конца, Backspace на пустой части), и DOM-фокус идёт
 * за ним, если стоит в ряду. Своих `tabindex` у плагина нет: остановка Tab у
 * каждой части — набор, который отдаёт ядро.
 */
export class TDateInputKeyboardPlugin extends TBasePlugin<
	IDateInput,
	TDateInputKeyboardPluginEvents
> {
	private _owner: IDateInput | null = null
	private _root: Element | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IDateInput>() ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._bind(element))
		elementPlugin?.events.on('removed', () => this._bind(null))

		this._listenTo(this._owner?.events, 'change:focusedSegment', this._onFocusedSegment)
	}

	override destroy(): void {
		this._bind(null)
		this._owner = null

		super.destroy()
	}

	/** Корень сменился — слушатели переезжают. */
	private _bind(root: Element | null): void {
		const previous: IDomEventTarget | null = this._root

		previous?.removeEventListener('keydown', this._onKeyDown)
		previous?.removeEventListener('focusin', this._onFocusIn)
		previous?.removeEventListener('focusout', this._onFocusOut)

		this._root = root

		const target: IDomEventTarget | null = root

		target?.addEventListener('keydown', this._onKeyDown)
		target?.addEventListener('focusin', this._onFocusIn)
		target?.addEventListener('focusout', this._onFocusOut)
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || event.defaultPrevented || event.isComposing) return

		const row = rowOf(owner, root)

		// Клавиша — только с самой части: у содержимого слотов свои клавиши
		if (!row || !segmentOf(owner, root, event.target)) return

		if ((event.ctrlKey || event.metaKey) && !event.altKey && event.code === 'KeyA') {
			event.preventDefault()
			selectRow(row)

			return
		}

		// С модификатором — чужой жест: Ctrl+C, Alt+←, Cmd+R. Shift свой — цифры и
		// стрелки с ним те же
		if (event.ctrlKey || event.metaKey || event.altKey) return

		if (this._handle(owner, root, row, event.key)) {
			event.preventDefault()
			collapseRowSelection(row)
		}
	}

	/** Исполнить клавишу; клавиша не поля — `false`. */
	private _handle(owner: IDateInput, root: Element, row: Element, key: string): boolean {
		const range = rowSelection(row)
		const touched = range ? touchedSegments(segmentsOf(owner, root), range) : []

		if (touched.length > 0) {
			if (ERASE_KEYS.has(key)) {
				owner.clearSegments(touched)

				return true
			}

			if (isCharacter(key)) return owner.replaceSegments(touched, key)
		}

		const command = COMMANDS[key]

		if (command) {
			command(owner)

			return true
		}

		return isCharacter(key) && owner.typeKey(key)
	}

	/** Фокус пришёл на часть — ядро ведёт набор в неё; не на часть — фокуса в поле нет. */
	private readonly _onFocusIn = (event: FocusEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root) return

		owner.focusSegment(segmentOf(owner, root, event.target)?.part)
	}

	/** Фокус ушёл не на часть — из поля. На соседнюю часть его приведёт `focusin`. */
	private readonly _onFocusOut = (event: FocusEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || segmentOf(owner, root, event.relatedTarget)) return

		owner.focusSegment(undefined)
	}

	/**
	 * Ядро перевело фокус на другую часть — DOM-фокус за ним, если он в ряду:
	 * фокус, который пользователь увёл со страницы, поле не забирает.
	 */
	private readonly _onFocusedSegment = (part: TDateFieldPart | undefined): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || part === undefined) return

		const current = segmentOf(owner, root, root.ownerDocument.activeElement)

		if (!current || current.part === part) return

		const element = segmentElementOf(owner, root, part)

		if (isFocusableElement(element)) element.focus()
	}
}

/**
 * Знак, а не имя клавиши (`Enter`, `Tab`): набор берёт один знак. Цифры
 * некоторых систем счисления — за пределами BMP, и знак у них из двух единиц
 * UTF-16.
 */
function isCharacter(key: string): boolean {
	return [...key].length === 1
}
