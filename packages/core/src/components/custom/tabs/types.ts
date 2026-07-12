import type {
	IControl,
	IControlProps,
	TControlEvents,
	TControlStates,
} from '../../base/control'
import type {
	TActivatableCollection,
	TActivatableCollectionEvents,
	TItemProxyEvents,
	IActivatableCollectionProps,
} from '../../base/collection'
import type { ITabItem } from './tab-item/types'

export type TTabsOrientation = 'horizontal' | 'vertical'
export type TTabsAlignment = 'start' | 'center' | 'end' | 'stretch'
export type TTabsPosition = 'start' | 'end'
export type TTabsView = 'line' | 'contained' | 'outline'

export type TTabsEvents = TControlEvents &
	TActivatableCollectionEvents &
	TItemProxyEvents<ITabItem> & {
		/** change:orientation */
		'change:orientation': (value: TTabsOrientation) => void
		/** change:alignment */
		'change:alignment': (value: TTabsAlignment) => void
		/** change:position */
		'change:position': (value: TTabsPosition) => void
		/** changeView */
		'changeView': (value: TTabsView) => void
		/** change:closable */
		'change:closable': (value: boolean) => void
		/** item:close — эмитится перед удалением таба при закрытии */
		'item:close': (item: ITabItem) => void
		/** item:closable — эмитится при изменении свойства closable у таба */
		'item:closable': (item: ITabItem, value: boolean) => void
		/** itemText — эмитится при изменении текста таба */
		'itemText': (item: ITabItem, value: string) => void
		/** itemRendered — эмитится при изменении rendered у таба */
		'itemRendered': (item: ITabItem, value: boolean) => void
		/** itemVisible — эмитится при изменении visible у таба */
		'itemVisible': (item: ITabItem, value: boolean) => void
		'itemPresent': (item: ITabItem, value: boolean) => void
	}

export interface ITabsProps<
	TItem extends ITabItem = ITabItem,
> extends IControlProps, IActivatableCollectionProps<TItem> {
	/** Ориентация табов */
	orientation?: TTabsOrientation
	/** Выравнивание табов */
	alignment?: TTabsAlignment
	/** Позиция табов (для vertical) */
	position?: TTabsPosition
	/** Стиль отображения */
	view?: TTabsView
	/** Разрешить закрытие табов (по умолчанию false) */
	closable?: boolean
}

export type TTabsStates = TControlStates

export interface ITabs extends IControl<ITabsProps, TTabsEvents> {
	/** Ориентация табов */
	orientation: TTabsOrientation
	/** Выравнивание табов */
	alignment: TTabsAlignment
	/** Позиция табов (для vertical) */
	position: TTabsPosition
	/** Стиль отображения */
	view: TTabsView
	/** Разрешить закрытие табов */
	closable: boolean
	/** Активный таб (из коллекции) */
	readonly activeItem: ITabItem | undefined
	/** Количество табов (из коллекции) */
	readonly count: number
	/** Доступ к коллекции табов */
	readonly collection: TActivatableCollection<any, any, ITabItem>
	/** Закрывает таб: проверяет возможность, эмитит событие, удаляет из коллекции */
	closeTab(item: ITabItem): boolean
	/** Возвращает true, если в коллекции есть хотя бы один таб с disabled = false */
	hasEnabledTabs(): boolean
}
