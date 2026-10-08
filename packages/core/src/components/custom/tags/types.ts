import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
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
 * Внешний вид тегов — значение `TButtonView`: пилюля тега (строка вместе с
 * кнопкой закрытия) — это вид кнопки. Значение — модификатор набора, по нему
 * тема рисует пилюлю каждого тега; сам тег значения не получает.
 */
export type TTagsView = TButtonView

/**
 * Что делать с тегами, которым не хватило ширины ряда.
 *
 * Одно свойство перечислением, а не пара флагов: тот же приём, что у
 * `TListContentFit` и `TListIndicator`.
 *
 * - `wrap` — теги переносятся на новую строку. Умолчание: так ряд ведёт себя
 *   в теме (`flex-wrap`), и смена поведения по умолчанию была бы ломающей.
 * - `scroll` — одна строка с нативной прокруткой.
 *
 * Оба значения — раскладка темы: ряд не меряется и не делится, поэтому набор
 * тегов не тянет за собой ни замера, ни панели. Ленту со стрелками или хвост
 * за кнопкой собирают в своей разметке: слот `default` отдаёт ей показанные
 * теги (`shown`).
 */
export type TTagsOverflow = 'wrap' | 'scroll'

export type TTagsEvents = TValueControlEvents<TTagsValue> &
	TCollectionStorageDriverEvents<ITagsItem> & {
		/** change:closable */
		'change:closable': (value: boolean) => void
		/** change:view */
		'change:view': (value: TTagsView | undefined) => void
		/** change:overflow */
		'change:overflow': (value: TTagsOverflow) => void
	}

/** Пропсы самого компонента (без коллекционной части). */
export interface ITagsComponentProps extends IValueControlProps<TTagsValue> {
	/** Разрешить закрытие тегов (по умолчанию false); тег переопределяет своим `closable` */
	closable?: boolean
	/** Внешний вид тегов — модификатор набора; по нему тема рисует пилюлю каждого тега */
	view?: TTagsView
	/** Что делать с тегами, которым не хватило ширины ряда. По умолчанию `wrap` */
	overflow?: TTagsOverflow
}

/** Полный набор пропсов Tags: компонентные + коллекция (engine, items, mode). */
export interface ITagsProps
	extends ITagsComponentProps, ITagsCollectionProps<ITagsItemProps, ITagsItem> {}

export interface ITags<
	TProps extends ITagsComponentProps = ITagsProps,
	TEvents extends TTagsEvents = TTagsEvents,
> extends IValueControl<TTagsValue, TProps, TEvents> {
	/** Разрешить закрытие тегов (глобально; тег переопределяет своим `closable`) */
	closable: boolean
	/** Внешний вид тегов — модификатор набора; тегам значение не доставляется */
	view: TTagsView | undefined
	/** Что делать с тегами, которым не хватило ширины ряда */
	overflow: TTagsOverflow
}
