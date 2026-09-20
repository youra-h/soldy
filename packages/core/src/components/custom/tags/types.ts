import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../base/value-control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { TAriaAttributes } from '../../../common'
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
 * Одно свойство перечислением, а не пара «переносить или нет» + «чем листать»:
 * пара даёт состояния, которых не бывает («переносим на строки» и «листаем»
 * разом). Тот же приём, что у `TListContentFit` и `TListIndicator`.
 *
 * - `wrap` — теги переносятся на новую строку. Умолчание: так ряд ведёт себя
 *   в теме (`flex-wrap`), и смена поведения по умолчанию была бы ломающей.
 * - `scroll` — одна строка с нативной прокруткой.
 * - `popover` — одна строка, в конце кнопка «…» с панелью, где лежат
 *   непоместившиеся теги.
 *
 * Листание стрелками (`arrows`) сюда не входит: ленте со стрелками нужен свой
 * компонент, и значение в перечислении без реализации было бы документацией
 * авансом.
 */
export type TTagsOverflow = 'wrap' | 'scroll' | 'popover'

export type TTagsEvents = TValueControlEvents<TTagsValue> &
	TCollectionStorageDriverEvents<ITagsItem> & {
		/** change:closable */
		'change:closable': (value: boolean) => void
		/** change:view */
		'change:view': (value: TTagsView | undefined) => void
		/** change:overflow */
		'change:overflow': (value: TTagsOverflow) => void
		/** change:moreLabel */
		'change:moreLabel': (value: string) => void
	}

/** Пропсы самого компонента (без коллекционной части). */
export interface ITagsComponentProps extends IValueControlProps<TTagsValue> {
	/** Разрешить закрытие тегов (по умолчанию false); тег переопределяет своим `closable` */
	closable?: boolean
	/** Внешний вид тегов — модификатор набора; по нему тема рисует пилюлю каждого тега */
	view?: TTagsView
	/** Что делать с тегами, которым не хватило ширины ряда. По умолчанию `wrap` */
	overflow?: TTagsOverflow
	/** Имя кнопки «…», открывающей панель с непоместившимися тегами */
	moreLabel?: string
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
	/** Внешний вид тегов — модификатор набора; тегам значение не доставляется */
	view: TTagsView | undefined
	/** Что делать с тегами, которым не хватило ширины ряда */
	overflow: TTagsOverflow
	/** Имя кнопки «…», открывающей панель с непоместившимися тегами */
	moreLabel: string
	/** Имя кнопки «…»: `moreLabel`. Своего экземпляра у кнопки нет */
	readonly moreAria: TAriaAttributes
	/** Классы ряда плюс свой класс панели: теги в ней — не потомки корня */
	readonly panelClasses: string[]
	/** ARIA панели: роль повторяет роль ряда */
	readonly panelAria: TAriaAttributes
}
