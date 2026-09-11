import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../base/value-control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { TButtonView } from '../button/types'
import type { ITagsCollectionProps } from './collection/types'
import type { ITagsItem, ITagsItemProps } from './item/types'

/**
 * Значение Tags — то, что выбрано, в виде значений элементов.
 *
 * Скаляр в режиме `single`, массив в `multiple`, `undefined`, когда не
 * выбрано ничего. По умолчанию режим коллекции `none`: Tags — это набор тегов
 * без выделения, выбор включается явным `mode`, как у ListBox. Связь в обе
 * стороны держит `TValueSelectionExtension`.
 */
export type TTagsValue = string | number | (string | number)[] | undefined

/**
 * Внешний вид тегов — значение `TButtonView` целиком: каждый тег рисует
 * `Button`, и вид набора это ровно вид, который берёт его `Button`. Как
 * `TListBoxView` у ListBox.
 */
export type TTagsView = TButtonView

export type TTagsEvents = TValueControlEvents<TTagsValue> &
	TCollectionStorageDriverEvents<ITagsItem> & {
		/** change:closable */
		'change:closable': (value: boolean) => void
		/** change:view */
		'change:view': (value: TTagsView) => void
	}

/** Пропсы самого компонента (без коллекционной части). */
export interface ITagsComponentProps extends IValueControlProps<TTagsValue> {
	/** Разрешить закрытие тегов (по умолчанию false); тег переопределяет своим `closable` */
	closable?: boolean
	/** Внешний вид тегов (передаётся во внутренний Button каждого элемента) */
	view?: TTagsView
}

/** Полный набор пропсов Tags: компонентные + коллекция (engine, items, mode). */
export interface ITagsProps
	extends ITagsComponentProps, ITagsCollectionProps<ITagsItemProps, ITagsItem> {}

export type TTagsStates = TValueControlStates<TTagsValue>

export interface ITags<
	TProps extends ITagsComponentProps = ITagsProps,
	TEvents extends TTagsEvents = TTagsEvents,
	TStates extends TTagsStates = TTagsStates,
> extends IValueControl<TTagsValue, TProps, TEvents, TStates> {
	/** Разрешить закрытие тегов (глобально; тег переопределяет своим `closable`) */
	closable: boolean
	/** Внешний вид тегов (целиком со набора, как у ListBox) */
	view: TTagsView
}
