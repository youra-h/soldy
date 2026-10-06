import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../../base/component-view'
import type { TAria, TAriaAttributes } from '../../../../common'
import type { TSlideEdge } from '../../slide'
import type { TTableRecord } from '../row/types'

/**
 * Выравнивание содержимого колонки.
 *
 * Значение библиотеки, а не темы: смысл у него один в любой теме. Стороны
 * логические: `start` и `end` — начало и конец строки в направлении письма.
 */
export type TTableColumnAlign = 'start' | 'center' | 'end'

/**
 * Своё сравнение двух записей для сортировки по колонке — по возрастанию, как
 * у `Array.prototype.sort`: отрицательное — `a` раньше, положительное — позже,
 * ноль — равны, и равные остаются в порядке данных. Убывание — тот же порядок
 * наоборот. Строки без записи сравнение не получает: они всегда в конце.
 */
export type TTableCompare = (a: TTableRecord, b: TTableRecord) => number

/**
 * CSS-переменные заголовка колонки — и только они: итог ширины с единицей
 * (`--s-table-column-width`). Ширину ячейки шапки ставит тема, а по шапке
 * раскладка таблицы режет колонку.
 */
export type TTableColumnStyle = Record<`--${string}`, string>

/**
 * Поле ручки ширины — выход колонки для разметки: ход и значение в px.
 *
 * Ручка — нативный `input type="range"` у края заголовка, как поле ручки
 * Slider: мобильный скринридер двигает его своим жестом. Своего экземпляра у
 * ручки нет — потребитель её не адресует, — поэтому поле отдаётся значением.
 *
 * Ход — границы колонки (`minWidth`, `maxWidth`), а без них — пределы ядра:
 * у поля обязан быть ход, а Home и End ведут к его краям. Ширина лежит в ходе
 * всегда: ширина из данных за пределами ядра расширяет ход до себя, и полю не
 * приходится поправлять значение самому.
 */
export type TTableColumnResizer = {
	/** Нижний край хода — `min` поля */
	min: number
	/** Верхний край хода — `max` поля */
	max: number
	/**
	 * Ширина колонки — `value` поля: итог, а без своей ширины — замер. Ширина
	 * неизвестна — нижний край хода, и ручки нет (`resizerRendered`)
	 */
	value: number
}

/**
 * Жест ручки — состояние колонки от `grab` до `release`. Наружу не отдаётся:
 * это память между командами плагина указателя.
 */
export type TTableColumnGesture = {
	/** Ширина при нажатии, px: её замерил плагин, от неё идёт сдвиг */
	from: number
	/**
	 * Нижний край хода — на весь жест: ход считается при нажатии и включает
	 * ширину нажатия, поэтому протяжка туда и обратно возвращает ширину
	 */
	lower: number
	/** Верхний край хода — на весь жест */
	upper: number
	/** Итог ширины до жеста — для `commit` */
	before: number | undefined
	/** Указатель сдвинулся: до первого сдвига жест — ещё нажатие, и ширину не задаёт */
	moved: boolean
}

export type TTableColumnEvents = TComponentViewEvents & {
	/** change:field */
	'change:field': (value: string) => void
	/** change:text */
	'change:text': (value: string) => void
	/**
	 * Итог ширины сменился — от своего значения или от границ. `undefined` —
	 * ширину решает тема
	 */
	'change:width': (value: number | undefined) => void
	/** change:minWidth */
	'change:minWidth': (value: number | undefined) => void
	/** change:maxWidth */
	'change:maxWidth': (value: number | undefined) => void
	/** change:align */
	'change:align': (value: TTableColumnAlign) => void
	/** change:sortable */
	'change:sortable': (value: boolean) => void
	/** change:compare */
	'change:compare': (value: TTableCompare | undefined) => void
	/** change:rowHeader */
	'change:rowHeader': (value: boolean) => void
	/** change:resizable */
	'change:resizable': (value: boolean) => void
	/** change:disabled */
	'change:disabled': (value: boolean) => void
	/**
	 * Поле ручки надо перечитать: сменились ход или ширина — своя, от границ или
	 * по замеру. Сверка — по содержимому
	 */
	'change:resizer': (value: TTableColumnResizer) => void
	/** Ручку начали или перестали рисовать */
	'change:resizerRendered': (value: boolean) => void
	/** Набор атрибутов поля ручки изменился */
	'change:resizerAria': (value: TAriaAttributes) => void
	/** Набор атрибутов обёртки содержимого заголовка изменился */
	'change:contentAria': (value: TAriaAttributes) => void
	/**
	 * Пользователь закончил менять ширину ручкой: отпустил её, если за жест
	 * ширина сменилась, или сдвинул клавишей. `change:width` приходит на каждом
	 * кадре протяжки, а это событие — одно на действие: по нему сохраняют
	 * настройку. Аргумент — итог ширины
	 */
	commit: (width: number) => void
}

export interface ITableColumnProps extends IComponentViewProps {
	/** Ключ значения в записи строки — и ключ колонки в коллекции колонок */
	field?: string
	/** Текст заголовка */
	text?: string
	/** Ширина, px. Не задана — ширину решает тема */
	width?: number
	/** Нижняя граница ширины, px. Сильнее верхней, как в CSS */
	minWidth?: number
	/** Верхняя граница ширины, px */
	maxWidth?: number
	/** Выравнивание содержимого колонки */
	align?: TTableColumnAlign
	/** Пользователь сортирует строки по колонке — кнопкой в заголовке */
	sortable?: boolean
	/** Своё сравнение записей. Не задано — значения поля `field` */
	compare?: TTableCompare
	/** Ячейки колонки — заголовки строк: по их тексту строку называют */
	rowHeader?: boolean
	/** Пользователь меняет ширину колонки ручкой у края заголовка */
	resizable?: boolean
	/** Колонка выключена: ручки нет. Пишет таблица — свой `disabled` */
	disabled?: boolean
}

export interface ITableColumn<
	TProps extends ITableColumnProps = ITableColumnProps,
	TEvents extends TTableColumnEvents = TTableColumnEvents,
> extends IComponentView<TProps, TEvents> {
	/** Ключ значения в записи строки — и ключ колонки в коллекции колонок */
	field: string
	/** Текст заголовка */
	text: string
	/**
	 * Ширина — итог: своё значение, прижатое к границам. Записывается своё,
	 * а читается итог. `undefined` — ширину решает тема
	 */
	width: number | undefined
	/** Нижняя граница ширины, px */
	minWidth: number | undefined
	/** Верхняя граница ширины, px */
	maxWidth: number | undefined
	/** Выравнивание содержимого колонки */
	align: TTableColumnAlign
	/**
	 * Пользователь сортирует строки по колонке — кнопкой в заголовке. Решение
	 * потребителя, поэтому по умолчанию нет. Код сортирует строки и по
	 * несортируемой колонке — записью состояния сортировки
	 */
	sortable: boolean
	/** Своё сравнение записей. Не задано — значения поля `field` */
	compare: TTableCompare | undefined
	/**
	 * Ячейки колонки — заголовки строк (`th scope="row"`): по тексту ячейки
	 * строку называют, в том числе её чекбокс выбора. Решение потребителя,
	 * поэтому по умолчанию нет
	 */
	rowHeader: boolean
	/**
	 * `--s-table-column-width` — итог ширины в px. Ширины нет — переменной нет,
	 * и ширину колонки решает тема
	 */
	readonly widthStyle: TTableColumnStyle
	/**
	 * Пользователь меняет ширину колонки ручкой у края заголовка. Решение
	 * потребителя, поэтому по умолчанию нет. Код меняет ширину и у колонки без
	 * ручки — записью `width`
	 */
	resizable: boolean
	/**
	 * Колонка выключена: ручки нет, и команды ручки ничего не делают. Пишет
	 * таблица — свой `disabled`, как строкам
	 */
	disabled: boolean
	/**
	 * Рисовать ли ручку: колонка `resizable`, не выключена, и ширина известна —
	 * своя или замер. До замера у колонки без своей ширины ручки нет: полю
	 * нечего показать
	 */
	readonly resizerRendered: boolean
	/** Поле ручки — ход и ширина в px. Снимок: каждое чтение собирает его заново */
	readonly resizer: TTableColumnResizer
	/**
	 * ARIA поля ручки. Своего экземпляра у ручки нет, поэтому набор держит
	 * колонка: имя полю — ссылку на обёртку содержимого — пишет плагин связок
	 */
	readonly resizerAria: TAria
	/**
	 * ARIA обёртки содержимого заголовка: её `id` пишет плагин связок. На неё
	 * ссылаются и заголовок, и поле ручки — так у обоих имя ровно текст колонки
	 */
	readonly contentAria: TAria
	/**
	 * Нажали на ручку: жест с ширины `width` — её замерил плагин. Ширина не
	 * меняется: нажатие без движения её не задаёт.
	 *
	 * @returns начался ли жест — у колонки без ручки и у выключенной нет
	 */
	grab(width: number): boolean
	/**
	 * Указатель жеста сдвинут на `offset` px от точки нажатия — в сторону роста
	 * ширины: плагин уже учёл, у какого края стоит ручка. Ширина — замеренная
	 * при нажатии плюс сдвиг, в ходе ручки. Вне жеста ничего не делает
	 */
	drag(offset: number): void
	/** Жест закончен: указатель отпустили или браузер его отнял */
	release(): void
	/**
	 * Сделать колонку шире на `delta` px, минус — уже: законченное действие
	 * клавиши. Ширина — в ходе ручки
	 */
	shift(delta: number): void
	/** Поставить ширину на край хода: `start` — наименьшая, `end` — наибольшая */
	moveToEdge(edge: TSlideEdge): void
	/**
	 * Замер плагина — ширина заголовка в px. Нужен колонке без своей ширины:
	 * её ширину решает тема, и узнать её ядро может только так. Ноль — колонка
	 * не разложена, ширина неизвестна
	 */
	notifyWidth(width: number): void
}
