import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../base/value-control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { IList, IListProps, TListEvents } from '../list'
import type { IListBoxCollectionProps } from './collection/types'
import type { IListBoxItem, IListBoxItemProps } from './item/types'

export type TListBoxView = 'plain' | 'outlined' | 'filled'

/**
 * Значение списка — то, что выбрано, в виде значений элементов.
 *
 * Скаляр в режиме `single`, массив в `multiple`, `undefined` когда не выбрано
 * ничего. Не отдельное состояние, а проекция выбора коллекции: связь в обе
 * стороны держит `TValueSelectionExtension`.
 */
export type TListBoxValue = string | number | (string | number)[] | undefined

export type TListBoxEvents = TValueControlEvents<TListBoxValue> &
	TCollectionStorageDriverEvents<IListBoxItem> &
	TListEvents & {
		/** change:view */
		'change:view': (value: TListBoxView) => void
	}

/**
 * Пропсы самого компонента (без коллекционной части).
 *
 * Списочные свойства приходят из `IListProps` — общего контракта с Select.
 * Общий там только контракт: реализация у каждого своя, потому что предок
 * занят (`TValueControl` здесь, `TInputControl` там).
 */
export interface IListBoxComponentProps
	extends IValueControlProps<TListBoxValue>, IListProps {
	/** Внешний вид компонента */
	view?: TListBoxView
}

/** Полный набор пропсов ListBox: компонентные + коллекция (engine, items, mode). */
export interface IListBoxProps
	extends IListBoxComponentProps, IListBoxCollectionProps<IListBoxItemProps, IListBoxItem> {}

export type TListBoxStates = TValueControlStates<TListBoxValue>

export interface IListBox<
	TProps extends IListBoxComponentProps = IListBoxProps,
	TEvents extends TListBoxEvents = TListBoxEvents,
	TStates extends TListBoxStates = TListBoxStates,
> extends IValueControl<TListBoxValue, TProps, TEvents, TStates>, IList {
	/** Внешний вид компонента */
	view: TListBoxView
}
