import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../base/component-view'
import type { ISwipeable, TSwipe, TSwipeableEvents } from '../../base/layer'
import type { TAria, TAriaAttributes, TDatasetAttributes } from '../../../common'

/**
 * Сторона и выравнивание панели у триггера.
 *
 * Четыре значения плагина якоря (`anchor_placement`) — по началу и концу
 * триггера: их Popover и отдаёт своему Frame. Центра (`top`, `bottom`) у
 * поповера нет — его потребитель пока только подсказка. Тип у ядра свой —
 * плагинов ядро не знает. Flip и shift у края окна плагин якоря делает поверх
 * выбора потребителя.
 */
export type TPopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

/**
 * Край контейнера, к которому прижата панель внутри него (`contained`): сверху,
 * снизу, у начала или у конца строки. `start` и `end` — логические: в RTL
 * панель встаёт у другого края вместе со строкой.
 *
 * Одно значение решает всё, что зависит от края, как `placement` у Drawer:
 * место панели (вдоль края — во всю длину, поперёк — по содержимому), сторону,
 * куда её смахивают (`swipeSide` — к этому краю), и место полосы жеста — у
 * противоположного края, откуда панель тянут. Union ядра, а не реестр темы:
 * значение читают ядро и плагин жеста.
 */
export type TPopoverEdge = 'top' | 'bottom' | 'start' | 'end'

export type TPopoverEvents = TComponentViewEvents &
	TSwipeableEvents & {
		/** change:open */
		'change:open': (value: boolean) => void
		/** change:closable */
		'change:closable': (value: boolean) => void
		/** change:closeLabel */
		'change:closeLabel': (value: string) => void
		/** change:lazyMount */
		'change:lazyMount': (value: boolean) => void
		/** change:placement */
		'change:placement': (value: TPopoverPlacement) => void
		/** change:contained */
		'change:contained': (value: boolean) => void
		/** change:edge */
		'change:edge': (value: TPopoverEdge) => void
		/** change:triggerAria — набор атрибутов триггера изменился */
		'change:triggerAria': (value: TAriaAttributes) => void
	}

export interface IPopoverProps extends IComponentViewProps {
	/** Открыта ли панель */
	open?: boolean
	/** Показывать ли кнопку закрытия в углу панели */
	closable?: boolean
	/** Имя кнопки закрытия для скринридера */
	closeLabel?: string
	/**
	 * Не монтировать содержимое, пока панель ни разу не открывали. После
	 * первого открытия содержимое остаётся, закрытие только прячет панель.
	 */
	lazyMount?: boolean
	/** Сторона и выравнивание панели у триггера */
	placement?: TPopoverPlacement
	/**
	 * Панель внутри контейнера: не уходит в `body` и не встаёт у триггера, а
	 * прижимается к краю `edge` ближайшего позиционированного предка.
	 * `placement` тогда не действует
	 */
	contained?: boolean
	/**
	 * Край контейнера, к которому прижата панель внутри него. Панель у
	 * триггера его не читает
	 */
	edge?: TPopoverEdge
	/**
	 * За что панель можно смахнуть, чтобы закрыть: панель у триггера — от него,
	 * панель внутри контейнера — к своему краю `edge`
	 */
	swipe?: TSwipe
}

/**
 * Поповер. Панель смахивают, чтобы закрыть (`ISwipeable`): у триггера — от
 * него, и сторону после flip знает только узел панели (`swipeSide` — `null`),
 * внутри контейнера — к своему краю (`edge`).
 */
export interface IPopover extends IComponentView<IPopoverProps, TPopoverEvents>, ISwipeable {
	/** Открыта ли панель */
	open: boolean
	/** Показывать ли кнопку закрытия в углу панели */
	closable: boolean
	/** Имя кнопки закрытия для скринридера */
	closeLabel: string
	/** Не монтировать содержимое до первого открытия */
	lazyMount: boolean
	/** Сторона и выравнивание панели у триггера */
	placement: TPopoverPlacement
	/** Панель прижата к краю ближайшего позиционированного предка, а не встаёт у триггера */
	contained: boolean
	/** Край контейнера, к которому прижата панель внутри него */
	edge: TPopoverEdge
	/**
	 * ARIA триггера — второй стороны связки «триггер ↔ панель»:
	 * `aria-haspopup`, `aria-expanded`; `aria-controls` пишет плагин
	 */
	readonly triggerAria: TAria
	/** `data-*` триггера для темы: открытый триггер выглядит нажатым */
	readonly triggerDataset: TDatasetAttributes
	/**
	 * `data-*` панели для темы: открыта ли она (`data-open`), тянут ли её
	 * (`data-swiping`), а внутри контейнера — ещё её край (`data-edge`)
	 */
	readonly panelDataset: TDatasetAttributes
	/** Имя кнопки закрытия: `closeLabel` */
	readonly closeAria: TAriaAttributes
	/** Смонтировано ли содержимое панели: без `lazyMount` — всегда */
	readonly contentRendered: boolean
	/** Рисовать ли полосу, за которую панель тянут: жест включён */
	readonly handleRendered: boolean
}
