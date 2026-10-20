import type { IStylable, IStylableProps, TStylableEvents } from '../../base/stylable'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type {
	TAria,
	TAriaAttributes,
	TClasses,
	TComponentSize,
	TComponentVariant,
	TDatasetAttributes,
	TEvented,
	TValuePayload,
} from '../../../common'
import type { IMenuCollectionProps, IMenuItemSource } from './collection/types'
import type { IMenuItem } from './item/types'

/** События владельца пунктов меню, которые слушает его коллекция. */
export type TMenuOwnerEvents = {
	/** change:open */
	'change:open': (value: boolean) => void
	/** change:size */
	'change:size': (payload: TValuePayload<TComponentSize>) => void
	/** change:panelVariant — вариант панели с пунктами сменился */
	'change:panelVariant': (payload: TValuePayload<TComponentVariant | undefined>) => void
}

/**
 * Владелец пунктов меню — тот, чья панель их показывает: меню (`TMenu`) или
 * пункт с подменю (`TMenuSubmenu`) — для пунктов подменю.
 *
 * Коллекции меню от владельца нужны четыре вещи: открытость — закрытое меню
 * закрывает открытые панели своих пунктов (подменю и пункта с панелью);
 * размер — его пункты получают размер меню; вариант панели — подменю среди
 * пунктов красит им свою панель, пока у него нет своего варианта; и что
 * делает выбор пункта (`notifyChoose`) — это решает владелец: меню
 * закрывается, подменю закрывает и меню, в котором стоит.
 *
 * Карта событий — параметр: шина инвариантна по своей карте, и у меню и у
 * подменю она своя. Коллекция требует от неё только `TMenuOwnerEvents`.
 */
export interface IMenuOwner<TEvents extends TMenuOwnerEvents = TMenuOwnerEvents> {
	/** Открыта ли панель с пунктами */
	open: boolean
	/** Размер меню — размер его пунктов */
	size: TComponentSize
	/**
	 * Вариант панели с пунктами — цвет пунктов без своего варианта: у меню —
	 * его вариант, у подменю — свой, а без него — вариант меню над ним
	 * (`menuVariant`). Его же несёт модификатор панели
	 * (`so-menu__panel--variant-<v>`)
	 */
	readonly panelVariant: TComponentVariant | undefined
	readonly events: TEvented<TEvents>
	/**
	 * Пункт-действие этого меню выбрали — меню закрывается. Зовёт коллекция
	 * перед тем, как сообщить `choose`: подписчик застаёт меню закрытым.
	 */
	notifyChoose(item: IMenuItem): void
}

/**
 * Сторона и выравнивание панели у триггера.
 *
 * Четыре значения плагина якоря (`anchor_placement`) — по началу и концу
 * триггера, как у Popover: их меню и отдаёт своему Frame. Тип у ядра свой —
 * плагинов ядро не знает. Flip и shift у края окна плагин якоря делает поверх
 * выбора потребителя.
 */
export type TMenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

/**
 * Чем меню открывают.
 *
 * - `press` — нажатием кнопки в слоте `trigger` (APG Menu Button): клик, ↓,
 *   Enter и пробел; панель встаёт у кнопки;
 * - `contextmenu` — как контекстное меню области в слоте `trigger`: правая
 *   кнопка мыши, долгое касание, клавиша контекстного меню и Shift+F10;
 *   панель встаёт у точки вызова (`point`).
 *
 * Панель, пункты, клавиши в панели и модель фокуса у режимов общие —
 * различаются способ открытия и якорь.
 */
export type TMenuOpenOn = 'press' | 'contextmenu'

/** Точка в координатах окна — как `clientX` и `clientY` события. */
export type TMenuPoint = { readonly x: number; readonly y: number }

export type TMenuEvents = TStylableEvents &
	TCollectionStorageDriverEvents<IMenuItem> & {
		/** change:open */
		'change:open': (value: boolean) => void
		/** change:placement */
		'change:placement': (value: TMenuPlacement) => void
		/** change:openOn */
		'change:openOn': (value: TMenuOpenOn) => void
		/** change:point — точка вызова контекстного меню сменилась */
		'change:point': (value: TMenuPoint | null) => void
		/** change:triggerAria — набор атрибутов триггера изменился */
		'change:triggerAria': (value: TAriaAttributes) => void
		/** change:panelClasses — классы панели изменились */
		'change:panelClasses': (value: string[]) => void
		/** change:panelVariant — вариант панели сменился: у меню — с его вариантом */
		'change:panelVariant': (payload: TValuePayload<TComponentVariant | undefined>) => void
		/** change:groupSeparators */
		'change:groupSeparators': (value: boolean) => void
	}

/** Пропсы самого меню (без коллекционной части). */
export interface IMenuComponentProps extends IStylableProps {
	/** Открыта ли панель */
	open?: boolean
	/** Сторона и выравнивание панели у триггера */
	placement?: TMenuPlacement
	/** Чем меню открывают: нажатием кнопки или как контекстное меню области */
	openOn?: TMenuOpenOn
	/**
	 * Рисовать ли разделитель между соседними секциями группировки пунктов из
	 * данных. Ручной `Menu.Separator` разметки свойство не трогает. По
	 * умолчанию — да
	 */
	groupSeparators?: boolean
}

/**
 * Полный набор пропсов Menu: свои и коллекции (`engine`, `items`, `trackBy`).
 * Пункт данными с вложенным `items` — подменю (`IMenuItemSource`).
 */
export interface IMenuProps
	extends IMenuComponentProps, IMenuCollectionProps<IMenuItemSource, IMenuItem> {}

/**
 * Меню действий у кнопки (APG Menu Button) или контекстное меню области:
 * триггер потребителя и панель с пунктами.
 */
export interface IMenu extends IStylable<IMenuProps, TMenuEvents>, IMenuOwner<TMenuEvents> {
	/** Открыта ли панель */
	open: boolean
	/** Сторона и выравнивание панели у триггера */
	placement: TMenuPlacement
	/** Чем меню открывают: нажатием кнопки или как контекстное меню области */
	openOn: TMenuOpenOn
	/** Рисовать ли разделитель между соседними секциями группировки пунктов */
	groupSeparators: boolean
	/**
	 * Точка вызова контекстного меню в координатах окна — панель встаёт у неё.
	 * `null` — точки нет, и панель встаёт у триггера
	 */
	point: TMenuPoint | null
	/**
	 * ARIA триггера — второй стороны связки «кнопка ↔ меню»: `aria-haspopup`,
	 * `aria-expanded`; `id` и `aria-controls` пишет плагин связок. У области
	 * контекстного меню (`openOn: 'contextmenu'`) набор пуст
	 */
	readonly triggerAria: TAria
	/** `data-*` триггера для темы: открытый триггер выглядит нажатым */
	readonly triggerDataset: TDatasetAttributes
	/**
	 * Классы панели: размер и вариант меню модификаторами блока панели — до
	 * телепортированной панели модификаторы корня не доходят
	 */
	readonly panelClasses: TClasses
}
