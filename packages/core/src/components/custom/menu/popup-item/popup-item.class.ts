import TMenuItem from '../item/item.class'
import type { TDefaultValues } from '../../../base/component'
import { TAria } from '../../../../common'
import type { TEventSink } from '../../../../common'
import type { IMenuPopupItem, IMenuPopupItemProps, TMenuPopup, TMenuPopupItemEvents } from './types'

/**
 * Пункт со своей панелью сбоку — общая часть пункта с подменю
 * (`TMenuSubmenu`) и пункта с панелью (`TMenuPopoverItem`).
 *
 * Строка пункта — `menuitem`, как у действия, но нажатие не выполняет
 * действие, а открывает панель у конца строки: у подменю в ней свои пункты, у
 * пункта с панелью — что угодно, хоть календарь. Связку с панелью объявляет
 * ARIA (APG Menu, пункт со всплывающим окном): `aria-haspopup` — что за панель,
 * `aria-expanded` — открыта ли она; `id` и `aria-controls` пишет плагин
 * связок. Панель — Frame без экземпляра в ядре, поэтому её набор держит пункт
 * (`panelAria`: роль панели, `id` и имя от строки — тот же плагин), как
 * `contentAria` у секции Accordion. Открытость теме — `data-open` в наборе
 * пункта: открытый пункт выглядит подсвеченным, пока открыта его панель.
 *
 * `id` — значение потребителя, как у поля (`TInputControl.id`): в `aria` ядро
 * его не пишет. Это `id` строки, на него ссылается панель (`aria-labelledby`),
 * и обе стороны пишет плагин связок (`TMenuPopupIdsPlugin`): свой `id`
 * главнее, без него — `id` от монтирования.
 *
 * Чем панель, по ARIA, — роль её и `aria-haspopup` строки одно слово, —
 * говорит наследник (`_declarePopup`): меню у подменю, диалог у пункта с
 * панелью. Модель фокуса и клавиши у видов свои — это плагины.
 *
 * Общее у видов в коллекции — тоже здесь, а не у каждого: меню держит открытой
 * одну такую панель, закрытое меню закрывает её, а нажатие строки открывает
 * панель, а не выполняет действие (`TMenuExtension`, `isMenuPopupItem`).
 */
export default abstract class TMenuPopupItem<
	TProps extends IMenuPopupItemProps = IMenuPopupItemProps,
	TEvents extends TMenuPopupItemEvents = TMenuPopupItemEvents,
>
	extends TMenuItem<TProps, TEvents>
	implements IMenuPopupItem<TProps, TEvents>
{
	static defaultValues: typeof TMenuItem.defaultValues &
		TDefaultValues<IMenuPopupItemProps, 'open', 'id'> = {
		...TMenuItem.defaultValues,
		open: false,
		id: undefined,
	}

	protected _open!: boolean
	protected _panelAria: TAria
	protected _id: string | undefined

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenuPopupItem
		const own = props as Partial<IMenuPopupItemProps>

		this._id = own.id ?? ctor.defaultValues.id

		// Сторона панели связки. Роль пишет наследник, `id` и `aria-labelledby`
		// на строку — плагин связок
		this._panelAria = new TAria()

		this._panelAria.events.on('change', () =>
			this._sink.emit('change:panelAria', this._panelAria.toObject()),
		)

		this._applyOpen(own.open ?? ctor.defaultValues.open)
	}

	/**
	 * Эмит собственных событий пункта со своей панелью — без приведения
	 * `this.events` к конкретной карте (см. `TEventSink` в
	 * `common/event/types.ts`).
	 */
	protected override get _sink(): TEventSink<TMenuPopupItemEvents> {
		return this.events
	}

	get open(): boolean {
		return this._open
	}

	set open(value: boolean) {
		if (this._open === value) return

		this._applyOpen(value)
		this._sink.emit('change:open', value)
	}

	/**
	 * Свой `id` строки пункта — значение потребителя: задают его там, где на
	 * пункт ссылается его разметка. Не задан — `undefined`, и у строки `id` от
	 * монтирования.
	 */
	get id(): string | undefined {
		return this._id
	}

	set id(value: string | undefined) {
		if (this._id === value) return

		this._id = value
		this._sink.emit('change:id', value)
	}

	/**
	 * Набор панели пункта. Живой, как `aria`: роль пишет пункт, `id` и ссылку
	 * на строку — плагин связок; за границу core → ui уходит снимок, об
	 * изменении набор сообщает `change:panelAria`.
	 */
	get panelAria(): TAria {
		return this._panelAria
	}

	/**
	 * Что за панель у пункта — зовёт конструктор наследника. Одно слово на обе
	 * стороны связки: `aria-haspopup` строки и роль панели.
	 */
	protected _declarePopup(popup: TMenuPopup): void {
		this._aria.add('aria-haspopup', popup)
		this._panelAria.add('role', popup)
	}

	protected _applyOpen(value: boolean): void {
		this._open = value

		this._aria.add('aria-expanded', String(value))

		// Открытый пункт тема красит подсвеченным, пока открыта его панель
		this._dataset.add('open', value)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			open: this._open,
			id: this._id,
		}
	}
}

/**
 * Пункт ли это со своей панелью — подменю или пункт с панелью: нажатие строки
 * открывает панель, а не выполняет действие.
 */
export function isMenuPopupItem(
	value: unknown,
): value is IMenuPopupItem<IMenuPopupItemProps, TMenuPopupItemEvents> {
	return value instanceof TMenuPopupItem
}
