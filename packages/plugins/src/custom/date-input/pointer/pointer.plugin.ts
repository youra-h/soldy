import type { IDateInput } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { isFocusableElement } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import {
	collapseRowSelection,
	rowOf,
	rowSelection,
	segmentOf,
	segmentsOf,
	touchedSegments,
} from '../parts'
import type { TDateInputSegmentNode } from '../types'
import type { TDateInputPointerPluginEvents } from './types'

/** Обёртки слотов — содержимое потребителя: его нажатия поле не трогает. */
const SLOTS: readonly string[] = ['__leading', '__trailing']

/**
 * TDateInputPointerPlugin — указатель поля даты: нажатие мимо частей и
 * контекстное меню.
 *
 * **Нажатие мимо частей** — по разделителю или пустому месту поля — отдаёт
 * фокус ближайшей по горизонтали части: курсор текста обещает это по всему
 * полю. Только при свёрнутом выделении: протяжку мышью, которая закончилась
 * мимо частей, нажатие не снимает. `mousedown` плагин не гасит: протяжка
 * начинается и с пустого места поля.
 *
 * **Контекстное меню.** «Вставить» и «Вырезать» браузер показывает только над
 * редактируемым узлом, а части нередактируемые — так дату выделяет протяжка.
 * Поэтому на `contextmenu` в ряду ряд на время становится `contenteditable`;
 * всё, что браузер в нём правил бы сам (`beforeinput`), гасится, а удаление
 * из меню очищает части, которые задело выделение. Обратно ряд возвращается
 * после `paste` и `cut` — их исполняет плагин буфера обмена, — на нажатие,
 * клавишу и уход фокуса. Выделение при переключении остаётся на месте. У поля
 * только для чтения и выключенного править нечего, и меню остаётся меню
 * выделения: «Копировать».
 */
export class TDateInputPointerPlugin extends TBasePlugin<
	IDateInput,
	TDateInputPointerPluginEvents
> {
	private _owner: IDateInput | null = null
	private _root: Element | null = null
	/** Ряд, который стал редактируемым ради контекстного меню. */
	private _editableRow: Element | null = null

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

	/** Корень сменился — слушатели переезжают, ряд перестаёт быть редактируемым. */
	private _bind(root: Element | null): void {
		const previous: IDomEventTarget | null = this._root

		previous?.removeEventListener('click', this._onClick)
		previous?.removeEventListener('contextmenu', this._onContextMenu)
		previous?.removeEventListener('beforeinput', this._onBeforeInput)
		previous?.removeEventListener('pointerdown', this._restore)
		previous?.removeEventListener('keydown', this._restore)
		previous?.removeEventListener('focusout', this._restore)
		previous?.removeEventListener('paste', this._restore)
		previous?.removeEventListener('cut', this._restore)

		this._restore()
		this._root = root

		const target: IDomEventTarget | null = root

		target?.addEventListener('click', this._onClick)
		target?.addEventListener('contextmenu', this._onContextMenu)
		target?.addEventListener('beforeinput', this._onBeforeInput)
		target?.addEventListener('pointerdown', this._restore)
		target?.addEventListener('keydown', this._restore)
		target?.addEventListener('focusout', this._restore)
		target?.addEventListener('paste', this._restore)
		target?.addEventListener('cut', this._restore)
	}

	/** Нажатие мимо частей и слотов — фокус ближайшей части. */
	private readonly _onClick = (event: MouseEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || owner.disabled || event.defaultPrevented) return
		if (segmentOf(owner, root, event.target) || inSlot(owner, root, event.target)) return

		const selection = root.ownerDocument.getSelection()

		// Протяжка закончилась мимо частей — выделение остаётся выделением
		if (selection && !selection.isCollapsed) return

		const nearest = nearestSegment(segmentsOf(owner, root), event.clientX)

		if (isFocusableElement(nearest)) nearest.focus()
	}

	/** Меню над рядом — ряд на время редактируемый: в меню появятся «Вставить» и «Вырезать». */
	private readonly _onContextMenu = (event: MouseEvent): void => {
		const owner = this._owner
		const root = this._root
		const row = owner && root ? rowOf(owner, root) : null

		if (!owner || !row || !(event.target instanceof Node) || !row.contains(event.target)) return
		if (owner.disabled || owner.readonly) return

		row.setAttribute('contenteditable', 'true')
		this._editableRow = row
	}

	/**
	 * Правка браузера в редактируемом ряду гасится: текст частей пишет ядро.
	 * Удаление из меню очищает задетые части.
	 */
	private readonly _onBeforeInput = (event: InputEvent): void => {
		const owner = this._owner
		const root = this._root
		const row = this._editableRow

		if (!owner || !root || !row) return

		event.preventDefault()

		if (!event.inputType.startsWith('delete')) return

		const range = rowSelection(row)

		if (range) owner.clearSegments(touchedSegments(segmentsOf(owner, root), range))

		collapseRowSelection(row)
		this._restore()
	}

	/** Ряд снова нередактируемый: протяжка выделяет дату целиком. */
	private readonly _restore = (): void => {
		this._editableRow?.removeAttribute('contenteditable')
		this._editableRow = null
	}
}

/** Лежит ли `target` в обёртке слота поля. */
function inSlot(owner: IDateInput, root: Element, target: EventTarget | null): boolean {
	if (!(target instanceof Element)) return false

	return SLOTS.some((slot) => {
		const wrapper = target.closest(owner.classes.resolve(slot, { point: true }))

		return wrapper !== null && root.contains(wrapper)
	})
}

/** Часть, ближайшая к точке по горизонтали; над частью расстояние — ноль. */
function nearestSegment(nodes: readonly TDateInputSegmentNode[], x: number): Element | undefined {
	let nearest: Element | undefined
	let distance = Number.POSITIVE_INFINITY

	for (const { element } of nodes) {
		const { left, right } = element.getBoundingClientRect()
		const away = x < left ? left - x : Math.max(x - right, 0)

		if (away < distance) {
			nearest = element
			distance = away
		}
	}

	return nearest
}
