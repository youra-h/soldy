import type { IField, IFieldProps, TFieldEvents } from '../../base/field'
import type {
	TAria,
	TAriaAttributes,
	TAttributes,
	TAttributesMap,
	TCalendarDate,
	TDatasetAttributes,
	TDatePart,
} from '../../../common'
import type { TCalendarUnavailable } from '../calendar'

/**
 * Часть времени в поле: час, минута, секунда и период суток — до полудня или
 * после. Секунда есть только у точности до секунды, период — только у
 * 12-часового цикла локали.
 */
export type TTimePart = 'hour' | 'minute' | 'second' | 'dayPeriod'

/** Часть поля: даты или времени. */
export type TDateFieldPart = TDatePart | TTimePart

/**
 * Вид поля: `date` — дата `YYYY-MM-DD`, `datetime` — дата со временем
 * `YYYY-MM-DDTHH:mm`, с точностью до секунды — `YYYY-MM-DDTHH:mm:ss`.
 */
export type TDateInputKind = 'date' | 'datetime'

/**
 * Точность времени: `minute` — час и минута, кусок времени `HH:mm`; `second` —
 * ещё секунда, `HH:mm:ss`. Это свойство времени, а не состава поля: у поля даты
 * частей времени нет, и точность в нём ничего не меняет.
 */
export type TTimePrecision = 'minute' | 'second'

/**
 * Дата со временем — строка `YYYY-MM-DDTHH:mm`, с точностью до секунды —
 * `YYYY-MM-DDTHH:mm:ss`, как `value` у `<input type="datetime-local">`: дата
 * календаря, `T`, час от `00` до `23`, минута и секунда. Ни долей секунды, ни
 * часового пояса: это время на часах, а не момент на оси времени. Строка — по
 * тем же причинам, что и дата (`TCalendarDate`), и порядок строк одной
 * точности — порядок моментов.
 */
export type TDateTime = string

/**
 * Значение поля — по виду и точности времени: дата `YYYY-MM-DD` или дата со
 * временем `YYYY-MM-DDTHH:mm` или `YYYY-MM-DDTHH:mm:ss`. Пока не собраны все
 * части формата, значения нет: `undefined`.
 */
export type TDateInputValue = TCalendarDate | TDateTime | undefined

/**
 * Граница поля — дата или дата со временем любой точности. Сравнение — с
 * точностью грубейшего из двух: граница-дата `max` пропускает любое время
 * своего дня, а время до минуты и время до секунды сравниваются до минуты.
 */
export type TDateInputBound = TCalendarDate | TDateTime | undefined

/**
 * Набранные части — числа по типу, без локали: год григорианский, час — от 0
 * до 23, минута и секунда — от 0 до 59, период суток — 0 до полудня и 1 после.
 * Смена локали, вида и точности их не трогает: другими становятся только текст
 * и состав частей формата. Нет числа — часть пуста.
 *
 * Год набора бывает и вне поддерживаемых: недописанный год календаря со
 * сдвигом (`th-TH`, буддийский год 25 — это григорианский −518). Дату из таких
 * частей не собрать, но показать набранное поле обязано.
 *
 * Час и период согласованы: выбранный период держит час в своей половине
 * суток. Пока период не выбран, половина часа — его собственная, а час,
 * набранный в формате без периода, выбирает период сам: там он виден целиком.
 */
export type TDateInputParts = Readonly<Partial<Record<TDateFieldPart, number>>>

/**
 * Часть поля в выходе `segments` — день, месяц, год, час, минута, секунда или
 * период суток. Своего экземпляра у части нет, наборы отдаются значением, как
 * у ручек Slider.
 */
export type TDateInputPart = {
	/** Ключ — тип: при смене локали часть меняет место, а её узел остаётся */
	key: TDateFieldPart
	type: TDateFieldPart
	/**
	 * Набранное число цифрами локали, у периода суток — его имя (`PM`), у пустой
	 * части — подсказка (`дд`, `––`)
	 */
	text: string
	/** Часть пуста и показывает подсказку */
	placeholder: boolean
	/** Имя части на языке локали (`день`) — её `aria-label`, пока набор части не задал другое */
	name: string
	/**
	 * Часть набирают цифрами (`true`) или словом (`false` — период суток,
	 * буквой): по нему сенсорный плагин выбирает экранную клавиатуру
	 */
	numeric: boolean
	/**
	 * Набор части: `role="spinbutton"`, имя части, `aria-value*` (у пустой нет
	 * `aria-valuenow`), `aria-invalid`, `aria-required`, `aria-readonly`,
	 * `aria-disabled` и остановка Tab — у каждой своя, у выключенного поля ни
	 * одной. Поверх — набор части снаружи ядра (`segmentSets`): `id`, а на
	 * сенсорных устройствах Apple — роль `textbox` и имя вместе с именем поля.
	 * Значение (`aria-value*`) — только у роли `spinbutton`: у текстового поля
	 * его нет, значение там — сам текст
	 */
	aria: TAriaAttributes
	/**
	 * Атрибуты HTML части — набор снаружи ядра (`segmentSets`): на сенсорном
	 * устройстве часть редактируемая (`contenteditable`, `inputmode`). Своих у
	 * ядра нет: сервер и компьютер рисуют часть нередактируемой
	 */
	attrs: TAttributesMap
	/** Набор для темы: `data-type` и `data-placeholder` */
	dataset: TDatasetAttributes
}

/**
 * Наборы части — то, что пишут в часть снаружи ядра: `id` части (плагин
 * связок), а на сенсорных устройствах — редактируемость, роль и имя
 * (сенсорный плагин). Ядро раскладывает их в `segments` поверх своего, как
 * календарь — наборы места сетки.
 */
export type TDateInputSegmentSets = {
	/** ARIA части: `id`, роль, имя */
	aria: TAria
	/** Атрибуты HTML части: `contenteditable`, `inputmode` */
	attrs: TAttributes
}

/** Разделитель — литерал формата между частями, как его отдал Intl. */
export type TDateInputLiteral = {
	/** Ключ — место в формате */
	key: string
	type: 'literal'
	text: string
	/** Все части пусты: разделитель — часть подсказки формата */
	placeholder: boolean
	/** Скрыт от скринридера: дату объявляют части, разделитель повторил бы формат */
	aria: TAriaAttributes
}

/** Часть или разделитель поля — в порядке формата локали. */
export type TDateInputSegment = TDateInputPart | TDateInputLiteral

/** Граница хода части — `Home` и `End`. */
export type TDateInputEdge = 'start' | 'end'

/**
 * Ход части — в числах, которые видит пользователь: год в календаре поля, час
 * в цикле часов локали, период суток — 0 и 1.
 */
export type TDatePartLimits = {
	readonly min: number
	readonly max: number
}

/** Своя правка значения: части, из которых оно собрано, и само значение. */
export type TDateInputEdit = {
	readonly parts: TDateInputParts
	readonly value: TDateInputValue
}

export type TDateInputEvents = TFieldEvents<TDateInputValue> & {
	/** change:min */
	'change:min': (value: TDateInputBound) => void
	/** change:max */
	'change:max': (value: TDateInputBound) => void
	/** change:unavailable */
	'change:unavailable': (value: TCalendarUnavailable | undefined) => void
	/** change:locale */
	'change:locale': (value: string) => void
	/** change:kind */
	'change:kind': (value: TDateInputKind) => void
	/** change:timePrecision */
	'change:timePrecision': (value: TTimePrecision) => void
	/**
	 * Части надо перечитать: набрали, стёрли, вставили, записали значение или
	 * плагин сменил набор части (`segmentSets`). Без аргумента: событие значит
	 * «перечитай `segments`»
	 */
	'change:segments': () => void
	/** Сменилась часть под фокусом — плагин переводит туда DOM-фокус */
	'change:focusedSegment': (part: TDateFieldPart | undefined) => void
}

export interface IDateInputProps extends IFieldProps<TDateInputValue> {
	/**
	 * Первый день или момент, который поле считает верным; раньше —
	 * `aria-invalid`
	 */
	min?: TDateInputBound
	/** Последний день или момент, который поле считает верным */
	max?: TDateInputBound
	/**
	 * Недоступные дни — та же функция, что у календаря: день значения, который
	 * она отвергает, — `aria-invalid`. Поле зовёт её без якоря: начатого
	 * диапазона у поля нет
	 */
	unavailable?: TCalendarUnavailable
	/**
	 * Локаль формата (BCP 47): порядок частей, разделители, цифры, цикл часов,
	 * направление. В разметке её нет: язык задаёт приложение на всю библиотеку,
	 * и пишет его плагин языка
	 */
	locale?: string
	/**
	 * Вид поля: `date` — дата, `datetime` — ещё час, минута и, у 12-часового цикла
	 * локали, период суток
	 */
	kind?: TDateInputKind
	/**
	 * Точность времени: `minute` — до минуты, `second` — ещё секунда. У поля даты
	 * ничего не меняет
	 */
	timePrecision?: TTimePrecision
}

export interface IDateInput extends IField<TDateInputValue, IDateInputProps, TDateInputEvents> {
	/** Первый верный день или момент */
	min: TDateInputBound
	/** Последний верный день или момент */
	max: TDateInputBound
	/** Недоступные дни */
	unavailable: TCalendarUnavailable | undefined
	/** Локаль формата */
	locale: string
	/** Вид поля: дата или дата со временем */
	kind: TDateInputKind
	/** Точность времени: до минуты или до секунды */
	timePrecision: TTimePrecision
	/** Собранное значение вне `min`/`max` или его день недоступен */
	readonly invalid: boolean
	/** Части и разделители в порядке формата локали */
	readonly segments: TDateInputSegment[]
	/**
	 * Наборы части `part` — в них пишут плагины: `id`, а на сенсорных
	 * устройствах — редактируемость, роль и имя. Ядро раскладывает их в
	 * `segments` поверх своего; их смена — `change:segments`
	 */
	segmentSets(part: TDateFieldPart): TDateInputSegmentSets
	/** Атрибуты ряда частей: `dir` и `lang` — по формату локали */
	readonly segmentsAttrs: TAttributesMap
	/** Направление ряда частей: по нему ←/→ ведут к соседней части */
	readonly segmentsDirection: 'ltr' | 'rtl'
	/** Часть под фокусом; фокуса в поле нет — `undefined` */
	readonly focusedSegment: TDateFieldPart | undefined
	/** Фокус пришёл на часть или ушёл из поля (`undefined`) — набранные цифры сброшены */
	focusSegment(part: TDateFieldPart | undefined): void
	/** Фокус на соседнюю часть в порядке формата: `1` — следующая, `-1` — предыдущая */
	shiftFocus(count: number): void
	/**
	 * Знак в часть под фокусом: цифра — в число, у периода суток — буква, с
	 * которой начинается имя периода (регистр не важен; с неё начинаются оба
	 * имени — период не меняется). Знак части — `true`, даже если поле только
	 * для чтения и править нечего; не её знак — `false`
	 */
	typeKey(key: string): boolean
	/**
	 * Знак вместо частей `parts` — их задело выделение: части пустеют, знак
	 * набирается в первую из них по порядку формата, фокус — туда же. Знак
	 * первой части — `true`, иначе `false`, и тогда части остаются как были
	 */
	replaceSegments(parts: readonly TDateFieldPart[], key: string): boolean
	/**
	 * ↑/↓: число части под фокусом на `count` — день, месяц, час, минута,
	 * секунда и период суток по кругу, год до края хода; пустая часть начинает с
	 * текущего момента
	 */
	shiftSegment(count: number): void
	/** Home/End: часть под фокусом — к краю её хода */
	moveSegmentToEdge(edge: TDateInputEdge): void
	/**
	 * Backspace: стереть последнюю цифру части под фокусом, период суток —
	 * целиком; пустая — фокус на предыдущую
	 */
	eraseDigit(): void
	/** Delete: очистить часть под фокусом */
	clearSegment(): void
	/** Очистить части `parts` — их задело выделение */
	clearSegments(parts: readonly TDateFieldPart[]): void
	/**
	 * Вставить значение текстом — ISO вида и точности поля или в формате поля —
	 * вместо всего значения. Не разобралось — ничего не меняется, `false`
	 */
	paste(text: string): boolean
}
