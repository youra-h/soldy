import type { IDatePicker } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IDomEventTarget } from '../../../utils'
import type { TDatePickerTriggerPluginEvents } from './types'

/**
 * TDatePickerTriggerPlugin — что открывает панель DatePicker: кнопка
 * календаря и Alt+↓ на поле. Ввод в поле её не открывает: части поля
 * набирают дату, а календарь — второй путь к ней, по запросу.
 *
 * Слушает корень, как плагины указателя Select и Popover: кнопка лежит в нём —
 * в слоте поля одной даты или после поля конца диапазона, — и клик по ней
 * всплывает до корня одинаково во всех адаптерах, чем бы её ни нарисовали.
 * Клик из Enter и пробела браузер у `<button>` делает сам, так что клавиатура
 * кнопки приходит тем же путём. Кнопку плагин узнаёт по классу её части
 * (`__trigger`), а разметка про открытие не знает ничего.
 *
 * - **Клик по кнопке** — тумблер (`toggleOpen`). По открытой панели он
 *   закрывает её без мигания: кнопка — внутри корня, и `TDismissPlugin`
 *   нажатие перед кликом мимо не считает.
 * - **Alt+↓** — только открыть, как у APG (Date Picker Dialog, комбобокс):
 *   клавишу поле не трогает — с модификатором она не его. Обработанная
 *   клавиша гасится `preventDefault`; та, что уже обработал кто-то другой
 *   (`defaultPrevented`), не наша.
 *
 * Панель телепортирована, и её клики и клавиши до корня не доходят.
 */
export class TDatePickerTriggerPlugin extends TBasePlugin<any, TDatePickerTriggerPluginEvents> {
	private _owner: IDatePicker | null = null
	private _root: Element | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IDatePicker>() ?? null

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

		previous?.removeEventListener('click', this._onClick)
		previous?.removeEventListener('keydown', this._onKeyDown)

		this._root = root

		const target: IDomEventTarget | null = root

		target?.addEventListener('click', this._onClick)
		target?.addEventListener('keydown', this._onKeyDown)
	}

	/** Клик по кнопке календаря — тумблер панели. */
	private readonly _onClick = (event: MouseEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || !(event.target instanceof Element)) return

		const trigger = event.target.closest(owner.classes.resolve('__trigger', { point: true }))

		if (trigger && root.contains(trigger)) owner.toggleOpen()
	}

	/** Alt+↓ — открыть; открыть нельзя — клавиша не наша. */
	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		const owner = this._owner

		if (!owner || event.defaultPrevented || event.key !== 'ArrowDown') return
		if (!event.altKey || event.ctrlKey || event.metaKey || !owner.openable) return

		event.preventDefault()
		owner.open = true
	}
}
