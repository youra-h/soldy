import type { ISelect } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { fieldOf } from '../../input/field'
import { closestControl, isFocusableElement } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import type { TSelectPointerPluginEvents } from './types'

/** Класс стрелки — единственное место клика, которое открывает/закрывает панель в `editable`. */
const ARROW_SELECTOR = '.so-select__arrow'

/**
 * TSelectPointerPlugin — указатель на поле Select: нажатие и клик.
 *
 * **Нажатие оставляет фокус в поле.** DOM-фокус комбобокса всегда на
 * `<input>` поля (APG Combobox): стрелки, Enter и Escape клавиатура берёт
 * только с него (`TSelectKeyboardPlugin`). Части поля без своего контрола —
 * стрелка, коробка, ряд тегов, немое содержимое слотов — фокус не принимают,
 * и `mousedown` по ним по умолчанию уносил его на `body`: панель открывалась
 * кликом по стрелке, а стрелки после этого прокручивали страницу — клавиши с
 * `body` до корня Select не доходят. Поэтому нажатие основной кнопкой по
 * такой части гасится (`preventDefault`) в обоих режимах, и фокус встаёт в
 * поле, если его там нет, — как у нативного `<select>` и у кнопок шага
 * NumberInput (`TNumberInputStepperPlugin`). Фокус уже в поле — он там и
 * остаётся, без `focusout`. Ставится он без прокрутки (`preventScroll`):
 * поле, по которому нажали, и так на экране, а страница не должна прыгать.
 *
 * Нажатие по контролу внутри корня — по `<input>`, кнопке очистки, тегу и
 * его крестику, кнопке потребителя в слоте — не трогается: что с ним делать,
 * контрол знает сам. Контрол под нажатием — общее правило `closestControl`
 * (`utils/tabStops.ts`), поле — `fieldOf`, как у клавиатуры. Правило одно для
 * мыши, пера и пальца: в select-only поле только для чтения, и экранной
 * клавиатуры у него нет, а в `editable` касание стрелки ставит фокус туда же,
 * куда касание поля.
 *
 * **Клик тумблит панель** (`ISelect.toggleOpen()`): в select-only — клик по
 * всему полю, в `editable` — только по стрелке (`.so-select__arrow`), а клик
 * по тексту поля ставит курсор и ничего не открывает. Режим плагин знает по
 * `change:editable`.
 *
 * Слушает сам корень (тот же элемент, что у `TDismissPlugin`/клавиатуры),
 * поэтому клик по вложенному `<input>` и по кнопке очистки (она сама
 * останавливает всплытие) доходят одинаково во всех шести адаптерах —
 * разметке про режим знать не нужно.
 */
export class TSelectPointerPlugin extends TBasePlugin<any, TSelectPointerPluginEvents> {
	private _owner: ISelect | null = null
	/** Корень Select: на нём слушатели, в нём ищутся контрол под нажатием и поле. */
	private _root: Element | null = null
	private _editable = false

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ISelect>() ?? null
		this._editable = Boolean(this._owner?.editable)

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._bind(element))
		elementPlugin?.events.on('removed', () => this._bind(null))

		this._listenTo(this._owner?.events, 'change:editable', (value: boolean) => {
			this._editable = value
		})
	}

	override destroy(): void {
		this._bind(null)
		this._owner = null

		super.destroy()
	}

	/** Корень сменился — слушатели переезжают на новый. */
	private _bind(root: Element | null): void {
		const previous: IDomEventTarget | null = this._root

		previous?.removeEventListener('click', this._onClick)
		previous?.removeEventListener('mousedown', this._onMouseDown)

		this._root = root

		const target: IDomEventTarget | null = root

		target?.addEventListener('click', this._onClick)
		target?.addEventListener('mousedown', this._onMouseDown)
	}

	private _isArrow(target: EventTarget | null): boolean {
		return target instanceof Element && !!target.closest(ARROW_SELECTOR)
	}

	/** select-only: клик по полю тумблит панель. editable: только по стрелке. */
	private readonly _onClick = (event: MouseEvent): void => {
		if (this._editable) {
			if (this._isArrow(event.target)) this._owner?.toggleOpen()

			return
		}

		this._owner?.toggleOpen()
	}

	/** Нажатие мимо контролов поля фокус из поля не уводит, а снаружи — ставит в него. */
	private readonly _onMouseDown = (event: MouseEvent): void => {
		const root = this._root
		const target = event.target

		if (!root || event.button !== 0 || !(target instanceof Element)) return
		if (closestControl(target, root)) return

		event.preventDefault()

		const field = fieldOf(root)

		if (isFocusableElement(field) && root.ownerDocument.activeElement !== field) {
			field.focus({ preventScroll: true })
		}
	}
}
