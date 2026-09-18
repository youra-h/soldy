import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../base/value-control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { TThemeRegistry } from '../../../common'
import type { IRadioGroupCollectionProps } from './collection/types'
import type { IRadioGroupItem, IRadioGroupItemProps } from './item/types'

/**
 * Реестр видов радио. Значения объявляет тема (см. `TThemeRegistry`).
 *
 * Вид задают группе, а рисует его каждое радио: модификатор стоит на корне
 * элемента, потому что у контейнера группы стилей нет — радио одной группы
 * стоят где угодно в разметке.
 */
export interface IRadioGroupViews extends TThemeRegistry {}

export type TRadioGroupView = Extract<keyof IRadioGroupViews, string>

/**
 * Значение группы — `value` отмеченного радио; `undefined` и `''` — не
 * отмечено ничего.
 *
 * Не отдельное состояние, а проекция активного элемента коллекции: связь в
 * обе стороны держит `TRadioGroupExtension`.
 */
export type TRadioGroupValue = string | number | undefined

export type TRadioGroupEvents = TValueControlEvents<TRadioGroupValue> &
	TCollectionStorageDriverEvents<IRadioGroupItem> & {
		/** change:view */
		'change:view': (value: TRadioGroupView | undefined) => void
	}

/** Пропсы самого компонента (без коллекционной части). */
export interface IRadioGroupComponentProps extends IValueControlProps<TRadioGroupValue> {
	/**
	 * Вид радио группы. Не задан — модификатора нет, и радио выглядят видом
	 * темы по умолчанию. Каждому радио его раздаёт группа.
	 */
	view?: TRadioGroupView
}

/** Полный набор пропсов RadioGroup: компонент + коллекция (engine, items, trackBy). */
export interface IRadioGroupProps
	extends
		IRadioGroupComponentProps,
		IRadioGroupCollectionProps<IRadioGroupItemProps, IRadioGroupItem> {}

export type TRadioGroupStates = TValueControlStates<TRadioGroupValue>

export interface IRadioGroup extends IValueControl<
	TRadioGroupValue,
	IRadioGroupProps,
	TRadioGroupEvents,
	TRadioGroupStates
> {
	/** Вид радио группы */
	view: TRadioGroupView | undefined
}
