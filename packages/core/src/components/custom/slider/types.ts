import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../base/value-control'
import type { TAriaAttributes, TDatasetAttributes, TEvented, TValuePayload } from '../../../common'
import type { ISlidable, TSlideOrientation, TSlideSnap } from '../slide'

/**
 * Значение ползунка: число — одна ручка, массив — по ручке на элемент.
 *
 * Форма сохраняется: ядро не превращает число в массив из одного элемента и
 * обратно, и `v-model` получает значение в той форме, в какой его задали.
 */
export type TSliderValue = number | number[]

/**
 * Шаг: число — ровная сетка от `min`, массив — список допустимых значений
 * (неравный шаг, вроде `1, 2, 5, 10, 20, 50`).
 */
export type TSliderStep = number | number[]

/** Метка шкалы, заданная списком: значение и необязательная подпись. */
export type TSliderMark = {
	/** Где стоит метка — значение шкалы */
	value: number
	/** Подпись под меткой; нет — метка одна точка */
	label?: string
}

/**
 * Метки на рельсе: `false` — нет, `true` — точки шкалы (узлы сетки или
 * элементы списка шага) без подписей, список — свои метки с подписями.
 */
export type TSliderMarks = boolean | TSliderMark[]

/**
 * CSS-переменные узла — и только они: позиция процентом от начала оси, с `%`,
 * уже с учётом `inverted`. Ось раскладывает тема: горизонталь — от начала
 * строки, вертикаль — снизу вверх, поэтому RTL разметке знать не нужно.
 */
export type TSliderStyle = Record<`--${string}`, string>

/**
 * Ручка — выход ядра для разметки. Своего экземпляра у ручки нет:
 * потребитель её не адресует, число ручек задаёт значение (AGENTS.md, «Часть
 * или слот»).
 */
export type TSliderThumb = {
	/** Значение ручки — `value` её поля */
	value: number
	/**
	 * Нижняя граница хода — `min` поля: предыдущая ручка плюс минимальный
	 * зазор, у первой — начало шкалы. Не больше значения: соседей ползунок не
	 * раздвигает, и поле не должно поправлять значение само.
	 */
	min: number
	/** Верхняя граница хода — `max` поля; не меньше значения */
	max: number
	/** `step` поля: шаг сетки или `any` у списка — неравного шага поле не знает */
	step: number | 'any'
	/** `--s-slider-position` — где центр ручки */
	style: TSliderStyle
	/** `data-dragging` — тянут эту ручку */
	dataset: TDatasetAttributes
	/** Имя ручки (`aria-label` из `thumbLabels`); у ручки без имени пусто */
	aria: TAriaAttributes
}

/** Метка на рельсе — выход ядра для разметки. */
export type TSliderShownMark = {
	/** Значение метки */
	value: number
	/** Подпись; у точки шкалы и метки без подписи — `undefined` */
	label: string | undefined
	/** `--s-slider-position` — где метка */
	style: TSliderStyle
	/**
	 * `data-in-range` — метка внутри заливки, края включительно;
	 * `data-current` — на метке стоит ручка
	 */
	dataset: TDatasetAttributes
}

/**
 * Жест указателя — состояние ползунка от `grab` или `press` до `release`.
 * Наружу не отдаётся: это память между командами плагина указателя.
 */
export type TSliderGesture = {
	/** Доля хода, в которой нажали */
	from: number
	/** Смещение захвата: доля ручки минус доля указателя; у нажатия мимо ручек — ноль */
	offset: number
	/** Первая из ручек на одном значении с нажатой — её ведёт движение к меньшим */
	lo: number
	/** Последняя из них — её ведёт движение к большим */
	hi: number
	/** Значение до жеста — для `commit` */
	before: TSliderValue
}

export type TSliderEvents = TValueControlEvents<TSliderValue> & {
	/** change:min */
	'change:min': (value: number) => void
	/** change:max */
	'change:max': (value: number) => void
	/** change:step */
	'change:step': (value: TSliderStep) => void
	/** change:largeStep */
	'change:largeStep': (value: number) => void
	/** change:orientation */
	'change:orientation': (value: TSlideOrientation) => void
	/** change:inverted */
	'change:inverted': (value: boolean) => void
	/** change:origin */
	'change:origin': (value: number | undefined) => void
	/** change:marks */
	'change:marks': (value: TSliderMarks) => void
	/** change:minStepsBetweenThumbs */
	'change:minStepsBetweenThumbs': (value: number) => void
	/** change:thumbLabels */
	'change:thumbLabels': (value: string[] | undefined) => void
	/** change:snap */
	'change:snap': (value: TSlideSnap) => void
	/** change:snapRadius */
	'change:snapRadius': (value: number) => void
	/** Идёт перетаскивание: с первого движения после нажатия до отпускания */
	'change:dragging': (value: boolean) => void
	/**
	 * Пользователь закончил менять значение: отпустил ручку, если за жест
	 * значение сменилось, или сдвинул его клавишей. `change:value` приходит на
	 * каждом кадре протяжки, а это событие — одно на действие: по нему
	 * сохраняют и отправляют. Значения — в форме значения ползунка.
	 */
	commit: (payload: TValuePayload<TSliderValue>) => void
}

export interface ISliderProps extends IValueControlProps<TSliderValue> {
	/** Начало хода */
	min?: number
	/** Конец хода. Вне сетки шага недостижим, как у нативного поля */
	max?: number
	/** Шаг числом или список допустимых значений */
	step?: TSliderStep
	/** Сколько шагов в крупном шаге (Shift со стрелкой, PageUp и PageDown); у списка — позиций */
	largeStep?: number
	/** Ось хода */
	orientation?: TSlideOrientation
	/** Значение растёт в обратную сторону: справа налево или сверху вниз */
	inverted?: boolean
	/**
	 * Откуда растёт заливка одной ручки. Не задано — от `min`; середина хода —
	 * заливка от центра. У нескольких ручек заливка всегда между крайними.
	 */
	origin?: number
	/** Метки на рельсе: точки шкалы (`true`) или свой список с подписями */
	marks?: TSliderMarks
	/** Минимальный зазор между соседними ручками — в шагах шкалы */
	minStepsBetweenThumbs?: number
	/**
	 * Имена ручек для скринридера, по порядку (APG, Multi-Thumb Slider).
	 * Подпись `Label` называет только первое поле, остальным имя — отсюда.
	 */
	thumbLabels?: string[]
	/**
	 * Щелчок: как метки притягивают ручку, которую тянут указателем. Опорные
	 * точки — метки (`marks`): без меток режим ничего не делает. Клавиши ходят
	 * по шагу при любом режиме
	 */
	snap?: TSlideSnap
	/** Радиус щелчка в px вдоль оси */
	snapRadius?: number
}

export interface ISlider
	extends IValueControl<TSliderValue, ISliderProps, TSliderEvents>, ISlidable {
	/** Начало хода */
	min: number
	/** Конец хода */
	max: number
	/** Шаг числом или список допустимых значений */
	step: TSliderStep
	/** Сколько шагов в крупном шаге */
	largeStep: number
	/** Ось хода */
	orientation: TSlideOrientation
	/** Значение растёт в обратную сторону */
	inverted: boolean
	/** Откуда растёт заливка одной ручки; `undefined` — от `min` */
	origin: number | undefined
	/** Метки на рельсе */
	marks: TSliderMarks
	/** Минимальный зазор между соседними ручками — в шагах шкалы */
	minStepsBetweenThumbs: number
	/** Имена ручек для скринридера */
	thumbLabels: string[] | undefined
	/** Щелчок: как метки притягивают ручку, которую тянут указателем */
	snap: TSlideSnap
	/** Радиус щелчка в px вдоль оси */
	snapRadius: number
	/**
	 * Шина ползунка. Объявлена здесь, потому что предки объявляют её
	 * по-разному: компонент — полной картой, перетаскивание — подпиской на
	 * смену щелчка. Полная карта подходит под обе.
	 */
	readonly events: TEvented<TSliderEvents>
	/** Идёт перетаскивание */
	readonly dragging: boolean
	/** Ручки — выход для разметки */
	readonly thumbs: TSliderThumb[]
	/** Края заливки — `--s-slider-range-start` и `--s-slider-range-end` */
	readonly rangeStyle: TSliderStyle
	/** Метки на рельсе — выход для разметки; меток нет — пусто */
	readonly shownMarks: TSliderShownMark[]
}
