import type {
	IInputControl,
	IInputControlProps,
	TInputControlEvents,
} from '../../base/input-control'
import type {
	TAriaAttributes,
	TAttributesMap,
	TCalendarDate,
	TDatasetAttributes,
	TDatePart,
} from '../../../common'

/**
 * Значение поля — дата `YYYY-MM-DD`. Пока дата не собрана целиком, значения
 * нет: `undefined`.
 */
export type TDateInputValue = TCalendarDate | undefined

/**
 * Набранные части даты — числа по типу, в григорианском календаре: смена
 * локали их не трогает, другим становится только их текст. Нет числа — часть
 * пуста.
 *
 * Год набора бывает и вне поддерживаемых: недописанный год календаря со
 * сдвигом (`th-TH`, буддийский год 25 — это григорианский −518). Дату из таких
 * частей не собрать, но показать набранное поле обязано.
 */
export type TDateInputParts = Readonly<Partial<Record<TDatePart, number>>>

/**
 * Часть поля в выходе `segments` — день, месяц или год. Своего экземпляра у
 * части нет, наборы отдаются значением, как у ручек Slider.
 */
export type TDateInputPart = {
	/** Ключ — тип: при смене локали часть меняет место, а её узел остаётся */
	key: TDatePart
	type: TDatePart
	/** Набранное число цифрами локали, у пустой части — подсказка (`дд`) */
	text: string
	/** Часть пуста и показывает подсказку */
	placeholder: boolean
	/**
	 * Набор части: `role="spinbutton"`, имя части, `aria-value*` (у пустой нет
	 * `aria-valuenow`), `aria-invalid`, `aria-required`, `aria-readonly`,
	 * `aria-disabled` и остановка Tab — у каждой своя, у выключенного поля ни
	 * одной
	 */
	aria: TAriaAttributes
	/** Набор для темы: `data-type` и `data-placeholder` */
	dataset: TDatasetAttributes
}

/** Разделитель — литерал формата между частями, как его отдал Intl. */
export type TDateInputLiteral = {
	/** Ключ — место в формате */
	key: string
	type: 'literal'
	text: string
	/** Дата пуста целиком: разделитель — часть подсказки формата */
	placeholder: boolean
	/** Скрыт от скринридера: дату объявляют части, разделитель повторил бы формат */
	aria: TAriaAttributes
}

/** Часть или разделитель поля — в порядке формата локали. */
export type TDateInputSegment = TDateInputPart | TDateInputLiteral

/** Граница хода части — `Home` и `End`. */
export type TDateInputEdge = 'start' | 'end'

/** Ход части — в числах, которые видит пользователь: год в календаре поля. */
export type TDatePartLimits = {
	readonly min: number
	readonly max: number
}

/** Итог набора цифры в часть. */
export type TDigitEntry = {
	/** Части после набора */
	readonly parts: TDateInputParts
	/** Набранные цифры части: к ним допишется следующая */
	readonly typed: string
	/** Дописать в часть больше некуда — фокус на следующую */
	readonly advance: boolean
}

/** Итог стирания цифры: части и набранные цифры, к которым допишется следующая. */
export type TDigitErase = {
	readonly parts: TDateInputParts
	readonly typed: string
}

export type TDateInputEvents = TInputControlEvents<TDateInputValue> & {
	/** change:min */
	'change:min': (value: TCalendarDate | undefined) => void
	/** change:max */
	'change:max': (value: TCalendarDate | undefined) => void
	/** change:locale */
	'change:locale': (value: string) => void
	/**
	 * Части надо перечитать: набрали, стёрли, вставили или записали значение.
	 * Без аргумента: событие значит «перечитай `segments`»
	 */
	'change:segments': () => void
	/** Сменилась часть под фокусом — плагин переводит туда DOM-фокус */
	'change:focusedSegment': (part: TDatePart | undefined) => void
}

export interface IDateInputProps extends IInputControlProps<TDateInputValue> {
	/** Первый день, который поле считает верным; раньше — `aria-invalid` */
	min?: TCalendarDate
	/** Последний день, который поле считает верным */
	max?: TCalendarDate
	/** Локаль формата (BCP 47): порядок частей, разделители, цифры, направление */
	locale?: string
}

export interface IDateInput extends IInputControl<
	TDateInputValue,
	IDateInputProps,
	TDateInputEvents
> {
	/** Первый верный день */
	min: TCalendarDate | undefined
	/** Последний верный день */
	max: TCalendarDate | undefined
	/** Локаль формата */
	locale: string
	/** Собранная дата вне `min`/`max` */
	readonly invalid: boolean
	/** Части и разделители в порядке формата локали */
	readonly segments: TDateInputSegment[]
	/** Атрибуты ряда частей: `dir` и `lang` — по формату локали */
	readonly segmentsAttrs: TAttributesMap
	/** Направление ряда частей: по нему ←/→ ведут к соседней части */
	readonly segmentsDirection: 'ltr' | 'rtl'
	/** Часть под фокусом; фокуса в поле нет — `undefined` */
	readonly focusedSegment: TDatePart | undefined
	/** Фокус пришёл на часть или ушёл из поля (`undefined`) — набранные цифры сброшены */
	focusSegment(part: TDatePart | undefined): void
	/** Фокус на соседнюю часть в порядке формата: `1` — следующая, `-1` — предыдущая */
	shiftFocus(count: number): void
	/**
	 * Знак в часть под фокусом. Цифра — `true`, даже если поле только для
	 * чтения и править нечего; не цифра — `false`
	 */
	typeKey(key: string): boolean
	/**
	 * Знак вместо частей `parts` — их задело выделение: части пустеют, цифра
	 * набирается в первую из них по порядку формата, фокус — туда же. Цифра —
	 * `true`, не цифра — `false`, и тогда части остаются как были
	 */
	replaceSegments(parts: readonly TDatePart[], key: string): boolean
	/** ↑/↓: число части под фокусом на `count`, день и месяц по кругу; пустая — сегодня */
	shiftSegment(count: number): void
	/** Home/End: часть под фокусом — к краю её хода */
	moveSegmentToEdge(edge: TDateInputEdge): void
	/** Backspace: стереть последнюю цифру части под фокусом; пустая — фокус на предыдущую */
	eraseDigit(): void
	/** Delete: очистить часть под фокусом */
	clearSegment(): void
	/** Очистить части `parts` — их задело выделение */
	clearSegments(parts: readonly TDatePart[]): void
	/**
	 * Вставить дату текстом — ISO или в формате поля — вместо всей даты. Не
	 * разобралась — ничего не меняется, `false`
	 */
	paste(text: string): boolean
}
