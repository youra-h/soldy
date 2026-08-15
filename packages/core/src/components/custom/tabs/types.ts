import type { IControl, IControlProps, TControlEvents, TControlStates } from '../../base/control'
import type { TEngineEvents } from '../../base/collection'
import type { ITabItem } from './tab-item/types'
import {
	TActivationExtension,
	TBatchExtension,
	TCollection,
	TOrderExtension,
	TPlainExtension,
	TFactoryExtension,
	TUniqueExtension,
} from '../../base/collection'
import { TTabsExtension } from './extensions'

export type TTabsOrientation = 'horizontal' | 'vertical'
export type TTabsAlignment = 'start' | 'center' | 'end' | 'stretch'
export type TTabsPosition = 'start' | 'end'
export type TTabsView = 'line' | 'contained' | 'outline'

export type TTabsEvents = TControlEvents &
	TEngineEvents<ITabItem> & {
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
		/** item:close — эмитится перед удалением таба при закрытии */
		'item:close': (item: ITabItem) => void
		/** item:closable — эмитится при изменении свойства closable у таба */
		'item:closable': (item: ITabItem, value: boolean) => void
		/** item:text — эмитится при изменении текста таба */
		'item:text': (item: ITabItem, value: string) => void
		/** item:rendered — эмитится при изменении rendered у таба */
		'item:rendered': (item: ITabItem, value: boolean) => void
		/** item:visible — эмитится при изменении visible у таба */
		'item:visible': (item: ITabItem, value: boolean) => void
		'item:present': (item: ITabItem, value: boolean) => void
		'item:disabled': (item: ITabItem, value: boolean) => void
		/** Массовое добавление (от batch-расширения) */
		'items:added': (items: ITabItem[]) => void
		/** Массовое удаление (от batch-расширения) */
		'items:removed': (items: ITabItem[]) => void
		/** Изменение выборки (от selection-расширения) */
		'change:selection': (items: ITabItem[]) => void
	}

export interface ITabsProps extends IControlProps {
	/** Начальные элементы табов */
	items?: any[]
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
}

export type TTabsFactoryExtensions = {
	factory: TFactoryExtension<ITabItem>
	unique: TUniqueExtension<ITabItem>
	order: TOrderExtension<ITabItem>
	plain: TPlainExtension<ITabItem>
	batch: TBatchExtension<ITabItem>
	activation: TActivationExtension<ITabItem>
	tabs: TTabsExtension<ITabs, ITabItem>
}

export type TTabsCollection = TCollection<ITabItem, TTabsFactoryExtensions>
