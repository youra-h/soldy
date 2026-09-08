import type { IControl, IControlProps, TControlEvents, TControlStates } from '../../base/control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { ITabsCollectionProps } from './collection/types'
import type { ITabsItem, ITabsItemProps } from './item/types'

export type TTabsOrientation = 'horizontal' | 'vertical'
export type TTabsAlignment = 'start' | 'center' | 'end' | 'stretch'
export type TTabsPosition = 'start' | 'end'
export type TTabsView = 'line' | 'contained' | 'outline'

export type TTabsEvents = TControlEvents &
	TCollectionStorageDriverEvents<ITabsItem> & {
		/** change:orientation */
		'change:orientation': (value: TTabsOrientation) => void
		/** change:alignment */
		'change:alignment': (value: TTabsAlignment) => void
		/** change:position */
		'change:position': (value: TTabsPosition) => void
		/** change:view */
		'change:view': (value: TTabsView) => void
		/** change:closable */
		'change:closable': (value: boolean) => void
		// /** item:close — эмитится перед удалением таба при закрытии */
		// 'item:close': (item: ITabsItem) => void
		// /** item:closable — эмитится при изменении свойства closable у таба */
		// 'item:closable': (item: ITabsItem, value: boolean) => void
		// /** item:text — эмитится при изменении текста таба */
		// 'item:text': (item: ITabsItem, value: string) => void
		// /** item:rendered — эмитится при изменении rendered у таба */
		// 'item:rendered': (item: ITabsItem, value: boolean) => void
		// /** item:visible — эмитится при изменении visible у таба */
		// 'item:visible': (item: ITabsItem, value: boolean) => void
		// 'item:present': (item: ITabsItem, value: boolean) => void
		// 'item:disabled': (item: ITabsItem, value: boolean) => void
		// /** Массовое добавление (от batch-расширения) */
		// 'items:added': (items: ITabsItem[]) => void
		// /** Массовое удаление (от batch-расширения) */
		// 'items:removed': (items: ITabsItem[]) => void
		// /** Изменение выборки (от selection-расширения) */
		// 'change:selection': (items: ITabsItem[]) => void
	}

/** Пропсы самого компонента Tabs (без коллекционной части). */
export interface ITabsComponentProps extends IControlProps {
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

/** Полный набор пропсов Tabs: компонент + коллекция (items, engine, trackBy). */
export interface ITabsProps
	extends ITabsComponentProps, ITabsCollectionProps<ITabsItemProps, ITabsItem> {}

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
}
