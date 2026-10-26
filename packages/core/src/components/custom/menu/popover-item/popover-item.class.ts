import TMenuPopupItem from '../popup-item/popup-item.class'
import type { TDefaultValues } from '../../../base/component'
import type { IMenuPopoverItem, IMenuPopoverItemProps, TMenuPopoverItemEvents } from './types'

/**
 * Пункт с панелью (`Menu.PopoverItem`): «Срок → календарь», «Цвет → палитра».
 *
 * Интерактивное содержимое в строке пункта не работает: строка — `menuitem`,
 * и скринридер собрал бы её имя из всего месяца, стрелки и Tab у меню свои, а
 * клик строки закрывает меню. Детьми `role="menu"` бывают только пункты,
 * группы и разделители, поэтому и рядом с пунктами в панели меню такому
 * содержимому места нет. Поэтому оно — в своей панели сбоку: строка — пункт
 * со своей панелью (`TMenuPopupItem`), панель — немодальный диалог, как у
 * Popover (APG: пункт со всплывающим окном). `aria-haspopup="dialog"` у
 * строки, `role="dialog"` у панели, имя панели — текст строки (плагин
 * связок).
 *
 * Наследник пункта, а не проп рядом со слотом: что делает нажатие и какая
 * ARIA у строки, решает ядро, а наличия слота оно не видит. Своего у вида —
 * только содержимое панели: `lazyMount` не монтирует его до первого открытия,
 * как у Popover, — календарь каждого пункта иначе монтировался бы вместе с
 * меню. Открывается панель так же, как подменю, — наведением, нажатием
 * строки, Enter, пробелом и стрелкой к концу строки; фокус, Escape и Tab — у
 * модели фокуса пункта (плагин).
 */
export default class TMenuPopoverItem
	extends TMenuPopupItem<IMenuPopoverItemProps, TMenuPopoverItemEvents>
	implements IMenuPopoverItem
{
	static defaultValues: typeof TMenuPopupItem.defaultValues &
		TDefaultValues<IMenuPopoverItemProps, 'lazyMount'> = {
		...TMenuPopupItem.defaultValues,
		lazyMount: false,
	}

	protected _lazyMount: boolean

	constructor(props: Partial<IMenuPopoverItemProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenuPopoverItem

		// Панель пункта — диалог: строка объявляет его, у панели — роль `dialog`
		this._declarePopup('dialog')

		this._lazyMount = props.lazyMount ?? ctor.defaultValues.lazyMount
	}

	/**
	 * Не монтировать содержимое, пока панель не открывали. Размонтировать при
	 * закрытии нельзя: открытость — это `visible` панели, а не `rendered`,
	 * иначе закрытие вычищало бы состояние содержимого. Поэтому после первого
	 * открытия переключается только видимость.
	 */
	get lazyMount(): boolean {
		return this._lazyMount
	}

	set lazyMount(value: boolean) {
		if (this._lazyMount === value) return

		this._lazyMount = value
		this.events.emit('change:lazyMount', value)
	}

	/**
	 * Whether the panel's content is mounted: without `lazyMount` — always (the
	 * item itself is mounted with the menu's first opening), with it — from the
	 * panel's own first opening on.
	 */
	override get contentRendered(): boolean {
		return !this._lazyMount || super.contentRendered
	}

	override getProps(): IMenuPopoverItemProps {
		return {
			...super.getProps(),
			lazyMount: this._lazyMount,
		}
	}
}

/** Пункт с панелью ли это: строка открывает сбоку панель с любым содержимым. */
export function isMenuPopoverItem(value: unknown): value is IMenuPopoverItem {
	return value instanceof TMenuPopoverItem
}
