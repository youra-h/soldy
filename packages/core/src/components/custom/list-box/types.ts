import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../base/value-control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
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
	TCollectionStorageDriverEvents<IListBoxItem> & {
		/** change:view */
		'change:view': (value: TListBoxView) => void
	}

/**
 * Пропсы самого компонента (без коллекционной части и без раскладки).
 *
 * `maxRows`, `wordWrap`, `autoWidth`, `scrollBehavior` сюда не входят: их
 * объявляет `TListLayoutPlugin` — там же, где они и обрабатываются.
 */
export interface IListBoxComponentProps extends IValueControlProps<TListBoxValue> {
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
> extends IValueControl<TListBoxValue, TProps, TEvents, TStates> {
	/** Внешний вид компонента */
	view: TListBoxView
}
