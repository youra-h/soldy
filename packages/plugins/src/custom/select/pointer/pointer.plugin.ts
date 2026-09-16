import type { ISelect } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IDomEventTarget } from '../../../utils'
import type { TSelectPointerPluginEvents } from './types'

/** Класс стрелки — единственное место клика, которое открывает/закрывает панель в `editable`. */
const ARROW_SELECTOR = '.s-select__arrow'

/**
 * TSelectPointerPlugin — клик по полю Select.
 *
 * Два режима, два обработчика, выбор между ними — по подписке на
 * `change:editable`, не по проверке внутри общего обработчика:
 *
 * - **select-only** — клик по всему полю тумблит панель
 *   (`ISelect.toggleOpen()`), как и было в разметке раньше.
 * - **editable** — клик по тексту поля ставит курсор и ничего не открывает;
 *   тумблит панель только клик по стрелке (`.s-select__arrow`). `mousedown`
 *   по стрелке гасится (`preventDefault`), чтобы не увести фокус с `<input>`,
 *   куда его в этом режиме печатает пользователь.
 *
 * Слушает сам корень (тот же элемент, что у `TDismissPlugin`/клавиатуры),
 * поэтому клик по вложенному `<input>` и по кнопке очистки (она сама
 * останавливает всплытие) доходят одинаково во всех шести адаптерах —
 * разметке про режим знать не нужно.
 */
export class TSelectPointerPlugin extends TBasePlugin<any, TSelectPointerPluginEvents> {
	private _owner: ISelect | null = null
	/** Узел нужен только под слушатели указателя — отсюда и тип. */
	private _element: IDomEventTarget | null = null
	private _editable = false

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ISelect>() ?? null
		this._editable = Boolean(this._owner?.editable)

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._element = element
			this._listen()
		})

		elementPlugin?.events.on('removed', () => {
			this._unlisten()
			this._element = null
		})

		this._owner?.events.on('change:editable', (value: boolean) => {
			this._editable = value
		})
	}

	override destroy(): void {
		this._unlisten()

		this._element = null
		this._owner = null

		super.destroy()
	}

	private _listen(): void {
		this._element?.addEventListener('click', this._onClick)
		this._element?.addEventListener('mousedown', this._onMouseDown)
	}

	private _unlisten(): void {
		this._element?.removeEventListener('click', this._onClick)
		this._element?.removeEventListener('mousedown', this._onMouseDown)
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

	/** Стрелка не забирает фокус у поля, в которое сейчас печатают. */
	private readonly _onMouseDown = (event: MouseEvent): void => {
		if (this._editable && this._isArrow(event.target)) event.preventDefault()
	}
}
