import TMenuPopupItem from '../popup-item/popup-item.class'
import { TMenu } from '../menu.class'
import type { TDefaultValues } from '../../../base/component'
import { TClasses } from '../../../../common'
import type { TComponentSize, TComponentVariant } from '../../../../common'
import type { IMenuItem } from '../item/types'
import type { IMenuSubmenu, IMenuSubmenuProps, TMenuSubmenuEvents } from './types'

/**
 * Пункт с подменю (`Menu.Submenu`): «Поделиться → Ссылка, Почта».
 *
 * Сразу две роли, как у каждого уровня меню (APG Menu, Radix `Sub`, Ark
 * вложенный `Menu.Root`): пункт меню, в котором стоит, — строка с текстом,
 * значком и стрелкой у конца, — и владелец своих пунктов. Свою коллекцию,
 * навигацию и слой у подменю — свои: одна коллекция на все уровни свела бы
 * их стрелки в один список.
 *
 * В меню над ним — пункт со своей панелью (`TMenuPopupItem`), как пункт с
 * панелью: открытость, `aria-expanded`, `data-open` и набор панели
 * (`panelAria`) — там. Панель подменю — меню: `aria-haspopup="menu"` у строки,
 * `role="menu"` у панели. Наследник пункта, а не режим: фабрика коллекции меню
 * строит пункты класса `TMenuItem`, и всё, что не его экземпляр, сочла бы
 * сырым источником.
 *
 * Для своих пунктов подменю — то же, что меню для своих (`IMenuOwner`):
 * размер пунктам пишет его коллекция, а выбор пункта закрывает меню целиком —
 * `notifyChoose` сообщает о нём меню, в котором подменю стоит, событием
 * `choose`, и то закрывается так же — до корня. Escape и стрелка к началу
 * строки закрывают один уровень — это плагины.
 *
 * Классы панели — свой набор (`panelClasses`): блок панели меню с размером
 * подменю и вариантом панели (`panelVariant`) — своим вариантом подменю, а без
 * него вариантом меню над ним (`menuVariant`): пункты подменю без своего
 * варианта красятся, как пункты меню. Панель телепортирована, и ни
 * модификаторы пункта, ни модификаторы панели меню до неё не доходят, поэтому
 * вариант меню над подменю — отдельный вход: его пишет коллекция того меню,
 * как размер. В свой `variant` он не пишется — в одном поле не различить,
 * задал ли его потребитель или записало меню.
 *
 * Разделитель между секциями группировки своих пунктов — своё свойство
 * (`groupSeparators`) с умолчанием меню: секции своих пунктов рисует разметка
 * подменю. От меню над ним значение не переходит.
 */
export default class TMenuSubmenu
	extends TMenuPopupItem<IMenuSubmenuProps, TMenuSubmenuEvents>
	implements IMenuSubmenu
{
	static defaultValues: typeof TMenuPopupItem.defaultValues &
		TDefaultValues<IMenuSubmenuProps, 'groupSeparators'> = {
		...TMenuPopupItem.defaultValues,
		groupSeparators: TMenu.defaultValues.groupSeparators,
	}

	protected _panelClasses: TClasses
	protected _groupSeparators: boolean
	protected _menuVariant: TComponentVariant | undefined = undefined

	constructor(props: Partial<IMenuSubmenuProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenuSubmenu

		this._groupSeparators = props.groupSeparators ?? ctor.defaultValues.groupSeparators

		// Панель подменю — меню: строка объявляет его, у панели — роль `menu`
		this._declarePopup('menu')

		// Блок — панели меню: панель подменю выглядит так же, как его
		this._panelClasses = new TClasses(`${TMenu.baseClass}__panel`)

		this._panelClasses.events.on('change', () =>
			this.events.emit('change:panelClasses', this._panelClasses.toArray()),
		)

		this._applyPanelSize(this.size)
		this._applyPanelVariant(this.panelVariant)

		this.events.on('change:size', ({ newValue, oldValue }) =>
			this._applyPanelSize(newValue, oldValue),
		)
		// Свой вариант сменился — вариант панели был прежним своим, а без него
		// вариантом меню над подменю
		this.events.on('change:variant', ({ oldValue }) =>
			this._syncPanelVariant(oldValue ?? this._menuVariant),
		)
	}

	/**
	 * Классы панели — блок `so-menu__panel` с размером подменю и вариантом
	 * панели (`panelVariant`). Размер подменю — размер меню, в котором оно
	 * стоит (его пишет коллекция), поэтому панели всех уровней одного размера.
	 */
	get panelClasses(): TClasses {
		return this._panelClasses
	}

	/**
	 * Вариант меню, в котором стоит подменю, — вариант панели того меню
	 * (`IMenuOwner.panelVariant`). Не проп: пишет его коллекция того меню —
	 * при добавлении пункта, поверх патча и на смену варианта панели меню, —
	 * как размер. Панель подменю красится им, пока у подменю нет своего
	 * варианта.
	 */
	get menuVariant(): TComponentVariant | undefined {
		return this._menuVariant
	}

	set menuVariant(value: TComponentVariant | undefined) {
		if (value === this._menuVariant) return

		const before = this.panelVariant

		this._menuVariant = value
		this._syncPanelVariant(before)
	}

	/**
	 * Вариант панели — свой вариант подменю, а без него вариант меню над ним
	 * (`menuVariant`): пункты подменю без своего варианта красятся, как пункты
	 * меню, а свой вариант подменю сильнее. Его же коллекция подменю передаёт
	 * подменю следующего уровня — так вариант меню доходит до всех уровней.
	 */
	get panelVariant(): TComponentVariant | undefined {
		return this.variant ?? this._menuVariant
	}

	/**
	 * Рисовать ли разделитель между соседними секциями группировки своих
	 * пунктов из данных. Ручной `Menu.Separator` разметки свойство не трогает.
	 */
	get groupSeparators(): boolean {
		return this._groupSeparators
	}

	set groupSeparators(value: boolean) {
		if (this._groupSeparators === value) return

		this._groupSeparators = value
		this.events.emit('change:groupSeparators', value)
	}

	/**
	 * Пункт подменю выбрали: подменю сообщает о выборе меню, в котором стоит
	 * (`choose` — его слушает коллекция того меню), — и оно закрывается
	 * целиком, до корня. Само подменю закрывается следом и тогда, когда его
	 * никто не слушает.
	 */
	notifyChoose(item: IMenuItem): void {
		this.events.emit('choose', item)
		this.open = false
	}

	protected _applyPanelSize(newValue: TComponentSize, oldValue?: TComponentSize): void {
		this._panelClasses.swap({ prefix: '--size-', oldValue, newValue })
	}

	/**
	 * Вход варианта панели сменился — свой вариант или вариант меню над
	 * подменю. Итог сменился — модификатор панели и `change:panelVariant`;
	 * не сменился (свой вариант перекрывает вариант меню) — ничего.
	 *
	 * @param before вариант панели до смены входа
	 */
	protected _syncPanelVariant(before: TComponentVariant | undefined): void {
		const after = this.panelVariant

		if (after === before) return

		this._applyPanelVariant(after, before)
		this.events.emit('change:panelVariant', { newValue: after, oldValue: before })
	}

	/** `swap` пропускает пустое значение: без варианта модификатора нет. */
	protected _applyPanelVariant(
		newValue: TComponentVariant | undefined,
		oldValue?: TComponentVariant,
	): void {
		this._panelClasses.swap({ prefix: '--variant-', oldValue, newValue })
	}

	override getProps(): IMenuSubmenuProps {
		return {
			...super.getProps(),
			groupSeparators: this._groupSeparators,
		}
	}
}

/** Пункт с подменю ли это: у него своя панель с пунктами. */
export function isMenuSubmenu(value: unknown): value is IMenuSubmenu {
	return value instanceof TMenuSubmenu
}
