import TMenuItem from '../item/item.class'
import { TMenu } from '../menu.class'
import type { TDefaultValues } from '../../../base/component'
import { TAria, TClasses } from '../../../../common'
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
 * Наследник пункта, а не режим: фабрика коллекции меню строит пункты класса
 * `TMenuItem`, и всё, что не его экземпляр, сочла бы сырым источником.
 *
 * Строка пункта — `menuitem`, как у действия, а связку с панелью объявляет
 * ARIA (`aria-haspopup="menu"` и `aria-expanded` — здесь, `id` и
 * `aria-controls` — плагин связок). Панель — Frame без экземпляра в ядре,
 * поэтому её набор держит пункт (`panelAria`: роль `menu`, `id` и имя от
 * строки пишет тот же плагин), как `contentAria` у секции Accordion.
 * Открытость теме — `data-open` в наборе пункта: открытый пункт выглядит
 * подсвеченным, пока открыта его панель.
 *
 * Для своих пунктов подменю — то же, что меню для своих (`IMenuOwner`):
 * размер пунктам пишет его коллекция, а выбор пункта закрывает меню целиком —
 * `notifyChoose` сообщает о нём меню, в котором подменю стоит, событием
 * `choose`, и то закрывается так же — до корня. Escape и стрелка к началу
 * строки закрывают один уровень — это плагины.
 *
 * Классы панели — свой набор (`panelClasses`): блок панели меню с размером и
 * вариантом подменю. Панель телепортирована, и ни модификаторы пункта, ни
 * модификаторы панели меню до неё не доходят.
 */
export default class TMenuSubmenu
	extends TMenuItem<IMenuSubmenuProps, TMenuSubmenuEvents>
	implements IMenuSubmenu
{
	static defaultValues: typeof TMenuItem.defaultValues &
		TDefaultValues<IMenuSubmenuProps, 'open'> = {
		...TMenuItem.defaultValues,
		open: false,
	}

	protected _open!: boolean
	protected _panelAria: TAria
	protected _panelClasses: TClasses

	constructor(props: Partial<IMenuSubmenuProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenuSubmenu

		// Строка объявляет, что у пункта своё меню; `id` и `aria-controls` на
		// панель пишет плагин связок в этот же набор
		this._aria.add('aria-haspopup', 'menu')

		// Сторона панели связки: панель — меню. `id` и `aria-labelledby` на
		// строку пишет плагин связок
		this._panelAria = new TAria()
		this._panelAria.add('role', 'menu')

		this._panelAria.events.on('change', () =>
			this.events.emit('change:panelAria', this._panelAria.toObject()),
		)

		// Блок — панели меню: панель подменю выглядит так же, как его
		this._panelClasses = new TClasses(`${TMenu.baseClass}__panel`)

		this._panelClasses.events.on('change', () =>
			this.events.emit('change:panelClasses', this._panelClasses.toArray()),
		)

		this._applyPanelSize(this.size)
		this._applyPanelVariant(this.variant)

		this.events.on('change:size', ({ newValue, oldValue }) =>
			this._applyPanelSize(newValue, oldValue),
		)
		this.events.on('change:variant', ({ newValue, oldValue }) =>
			this._applyPanelVariant(newValue, oldValue),
		)

		this._applyOpen(props.open ?? ctor.defaultValues.open)
	}

	get open(): boolean {
		return this._open
	}

	set open(value: boolean) {
		if (this._open === value) return

		this._applyOpen(value)
		this.events.emit('change:open', value)
	}

	/**
	 * Набор панели подменю. Живой, как `aria`: роль пишет пункт, `id` и
	 * ссылку на строку — плагин связок; за границу core → ui уходит снимок,
	 * об изменении набор сообщает `change:panelAria`.
	 */
	get panelAria(): TAria {
		return this._panelAria
	}

	/**
	 * Классы панели — блок `so-menu__panel` с размером и вариантом подменю.
	 * Размер подменю — размер меню, в котором оно стоит (его пишет коллекция),
	 * поэтому панели всех уровней одного размера.
	 */
	get panelClasses(): TClasses {
		return this._panelClasses
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

	protected _applyOpen(value: boolean): void {
		this._open = value

		this._aria.add('aria-expanded', String(value))

		// Открытый пункт тема красит подсвеченным, пока открыта его панель
		this._dataset.add('open', value)
	}

	protected _applyPanelSize(newValue: TComponentSize, oldValue?: TComponentSize): void {
		this._panelClasses.swap({ prefix: '--size-', oldValue, newValue })
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
			open: this._open,
		}
	}
}

/** Пункт с подменю ли это: у него своя панель с пунктами. */
export function isMenuSubmenu(value: unknown): value is IMenuSubmenu {
	return value instanceof TMenuSubmenu
}
