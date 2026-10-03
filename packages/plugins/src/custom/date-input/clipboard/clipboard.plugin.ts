import type { IDateInput } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IDomEventTarget } from '../../../utils'
import { rangeText, rowOf, rowSelection, segmentsOf, touchedSegments } from '../parts'
import type { TDateInputClipboardPluginEvents } from './types'

/** Текст для буфера и перетаскивания — обычный текст, без разметки частей. */
const PLAIN_TEXT = 'text/plain'

/**
 * TDateInputClipboardPlugin — буфер обмена и перетаскивание поля даты: дата
 * копируется, вырезается и вставляется как текст.
 *
 * **Копирование и вырезание** — то, что выделено в ряду, текстом узлов:
 * `12.05.2026`, `05.2026`. Текст собирает плагин, а не браузер: Chrome ставит
 * перевод строки между флекс-коробками частей. Слушатель — на документе:
 * протяжка, начатая с пустого места поля, оставляет фокус вне частей, а
 * событие буфера приходит туда, где фокус. Выделение шире ряда — не поля, и его
 * копирует браузер. Вырезание вдобавок очищает задетые части; у поля только для
 * чтения — копирует, и только.
 *
 * **Перетаскивание** выделенной даты кладёт тот же текст.
 *
 * **Вставка** приходит на часть под фокусом, хотя она нередактируемая: текст
 * уходит ядру, и дата ISO или в формате поля заменяет всю дату. Не дата —
 * ничего не меняется, но вставка гасится всегда: в ряду, ставшем редактируемым
 * ради контекстного меню, браузер вставил бы текст в разметку.
 */
export class TDateInputClipboardPlugin extends TBasePlugin<
	IDateInput,
	TDateInputClipboardPluginEvents
> {
	private _owner: IDateInput | null = null
	private _root: Element | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IDateInput>() ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._bind(element))
		elementPlugin?.events.on('removed', () => this._bind(null))
	}

	override destroy(): void {
		this._bind(null)
		this._owner = null

		super.destroy()
	}

	/** Корень сменился — слушатели переезжают, у документа — тоже: он может быть другим. */
	private _bind(root: Element | null): void {
		const previous: IDomEventTarget | null = this._root

		previous?.removeEventListener('paste', this._onPaste)
		previous?.removeEventListener('dragstart', this._onDragStart)
		this._root?.ownerDocument.removeEventListener('copy', this._onCopy)
		this._root?.ownerDocument.removeEventListener('cut', this._onCut)

		this._root = root

		const target: IDomEventTarget | null = root

		target?.addEventListener('paste', this._onPaste)
		target?.addEventListener('dragstart', this._onDragStart)
		root?.ownerDocument.addEventListener('copy', this._onCopy)
		root?.ownerDocument.addEventListener('cut', this._onCut)
	}

	private readonly _onCopy = (event: ClipboardEvent): void => {
		this._copy(event)
	}

	/** Вырезание — копирование и очистка задетых частей. */
	private readonly _onCut = (event: ClipboardEvent): void => {
		const range = this._copy(event)
		const owner = this._owner
		const root = this._root

		if (range && owner && root) {
			owner.clearSegments(touchedSegments(segmentsOf(owner, root), range))
		}
	}

	/** Положить в буфер выделенное в ряду; выделение не поля — `null`, буфер браузера. */
	private _copy(event: ClipboardEvent): Range | null {
		const range = this._selection()

		if (event.defaultPrevented || !range || !event.clipboardData) return null

		event.clipboardData.setData(PLAIN_TEXT, rangeText(range))
		event.preventDefault()

		return range
	}

	private readonly _onPaste = (event: ClipboardEvent): void => {
		const owner = this._owner
		const root = this._root
		const row = owner && root ? rowOf(owner, root) : null

		if (!owner || !row || event.defaultPrevented) return
		if (!(event.target instanceof Node) || !row.contains(event.target)) return

		event.preventDefault()
		owner.paste(event.clipboardData?.getData(PLAIN_TEXT) ?? '')
	}

	/** Перетаскивают выделенную дату — тот же текст, что в буфер. */
	private readonly _onDragStart = (event: DragEvent): void => {
		const range = this._selection()

		if (!range || !event.dataTransfer) return

		event.dataTransfer.clearData()
		event.dataTransfer.setData(PLAIN_TEXT, rangeText(range))
	}

	/** Выделение документа в ряду поля. */
	private _selection(): Range | null {
		const owner = this._owner
		const root = this._root
		const row = owner && root ? rowOf(owner, root) : null

		return row ? rowSelection(row) : null
	}
}
