import type { IClearable, IClearableProps, TClearableEvents } from '../../base/clearable'
import type {
	TAria,
	TAriaAttributes,
	TAttributes,
	TAttributesMap,
	TDataset,
	TDatasetAttributes,
	TValuePayload,
} from '../../../common'

/** Значение поля числа: число; пусто или набрано не число («-») — `undefined`. */
export type TNumberInputValue = number | undefined

/**
 * Опции формата — `Intl.NumberFormatOptions` без тех, чей текст поле обратно
 * не разберёт: сокращённой записи (`notation`, `compactDisplay`),
 * бухгалтерского знака в скобках (`currencySign`) и знака, который прячет
 * минус (`signDisplay: 'never'`). Процент, валюта и единица — `style` с
 * `currency` или `unit`, точность — `minimumFractionDigits` и соседи.
 */
export type TNumberInputFormatOptions = Omit<
	Intl.NumberFormatOptions,
	'notation' | 'compactDisplay' | 'currencySign' | 'signDisplay'
> & {
	signDisplay?: Exclude<Intl.NumberFormatOptions['signDisplay'], 'never'>
}

/** Граница, к которой ведут Home и End. */
export type TNumberInputEdge = 'start' | 'end'

/**
 * Наборы поля ввода — то, что пишут в него снаружи ядра: на сенсорных
 * устройствах Apple — роль `textbox` и клавиатура с минусом (сенсорный
 * плагин). Ядро раскладывает их в `inputAria` и `inputAttrs` поверх своего,
 * как поле даты — наборы частей.
 */
export type TNumberInputSets = {
	/** ARIA поля: роль */
	readonly aria: TAria
	/** Атрибуты HTML поля: `inputmode` */
	readonly attrs: TAttributes
}

/** Своя правка: текст поля и значение, которое из него прочитано. */
export type TNumberInputEdit = {
	readonly text: string
	readonly value: TNumberInputValue
}

export type TNumberInputEvents = TClearableEvents<TNumberInputValue> & {
	/** change:min */
	'change:min': (value: number | undefined) => void
	/** change:max */
	'change:max': (value: number | undefined) => void
	/** change:step */
	'change:step': (value: number) => void
	/** change:largeStep */
	'change:largeStep': (value: number) => void
	/** change:formatOptions */
	'change:formatOptions': (value: TNumberInputFormatOptions | undefined) => void
	/** change:placeholder */
	'change:placeholder': (value: string) => void
	/** change:locale */
	'change:locale': (value: string) => void
	/** change:text — сменился текст поля: набор, шаг, запись значения, смена формата */
	'change:text': (value: string) => void
	/**
	 * Плагин сменил набор поля (`inputSets`). Без аргумента: событие значит
	 * «перечитай `inputAria` и `inputAttrs`»
	 */
	'change:inputSets': () => void
	/** change:decrementAria — набор кнопки «меньше» изменился */
	'change:decrementAria': (value: TAriaAttributes) => void
	/** change:incrementAria — набор кнопки «больше» изменился */
	'change:incrementAria': (value: TAriaAttributes) => void
	/** change:decrementDataset — набор темы кнопки «меньше» изменился */
	'change:decrementDataset': (value: TDatasetAttributes) => void
	/** change:incrementDataset — набор темы кнопки «больше» изменился */
	'change:incrementDataset': (value: TDatasetAttributes) => void
	/**
	 * Пользователь закончил менять значение: набор — уходом фокуса или Enter,
	 * шаг клавишей, нажатие или удержание кнопки шага — отпусканием, очистка.
	 * `change:value` приходит на каждый набранный знак и каждый шаг удержания,
	 * а это событие — одно на действие, если оно сменило значение: по нему
	 * сохраняют и отправляют
	 */
	commit: (payload: TValuePayload<TNumberInputValue>) => void
}

export interface INumberInputProps extends IClearableProps<TNumberInputValue> {
	/** Наименьшее значение; не задано — снизу границы нет */
	min?: number
	/** Наибольшее значение; не задано — сверху границы нет */
	max?: number
	/** Шаг стрелок и кнопок: сетка от `min`, без него — от нуля */
	step?: number
	/** Сколько шагов в крупном шаге (Shift со стрелкой, PageUp и PageDown) */
	largeStep?: number
	/** Опции формата числа: процент, валюта, единица, точность */
	formatOptions?: TNumberInputFormatOptions
	/** Подсказка пустого поля */
	placeholder?: string
	/**
	 * Локаль формата (BCP 47): цифры, разделители, знаки, направление. В
	 * разметке её нет: язык задаёт приложение на всю библиотеку, и пишет его
	 * плагин языка
	 */
	locale?: string
}

export interface INumberInput extends IClearable<
	TNumberInputValue,
	INumberInputProps,
	TNumberInputEvents
> {
	/** Наименьшее значение; `undefined` — снизу границы нет */
	min: number | undefined
	/** Наибольшее значение; `undefined` — сверху границы нет */
	max: number | undefined
	/** Шаг стрелок и кнопок */
	step: number
	/** Сколько шагов в крупном шаге */
	largeStep: number
	/** Опции формата числа */
	formatOptions: TNumberInputFormatOptions | undefined
	/** Подсказка пустого поля */
	placeholder: string
	/** Локаль формата */
	locale: string
	/**
	 * Текст поля — буфер правки: пока набирают, в нём набранное, как есть; после
	 * `commit` и записи значения — число строкой формата
	 */
	readonly text: string
	/** Минус набирается: `min` не задан или меньше нуля */
	readonly signed: boolean
	/** Кнопка «меньше» выключена: поле выключено, только для чтения или значение у нижнего края */
	readonly decrementDisabled: boolean
	/** Кнопка «больше» выключена: поле выключено, только для чтения или значение у верхнего края */
	readonly incrementDisabled: boolean
	/** Набор кнопки «меньше»: не остановка Tab; имя пишет плагин имён */
	readonly decrementAria: TAria
	/** Набор кнопки «больше»: не остановка Tab; имя пишет плагин имён */
	readonly incrementAria: TAria
	/** Набор темы кнопки «меньше»: `data-pressed`, пока её держат, пишет плагин кнопок */
	readonly decrementDataset: TDataset
	/** Набор темы кнопки «больше» */
	readonly incrementDataset: TDataset
	/** Наборы поля ввода — в них пишут плагины; их смена — `change:inputSets` */
	readonly inputSets: TNumberInputSets
	/**
	 * ARIA поля ввода: `role="spinbutton"`, `aria-valuenow` и `aria-valuetext`
	 * у числа, `aria-valuemin` и `aria-valuemax` — у заданных границ. Поверх —
	 * набор `inputSets`; роль из него (`textbox`) снимает `aria-value*`
	 */
	readonly inputAria: TAriaAttributes
	/**
	 * Атрибуты HTML поля ввода: `dir` и `lang` числа в формате, `inputmode` —
	 * `decimal` у формата с дробью, иначе `numeric`. Поверх — набор `inputSets`
	 */
	readonly inputAttrs: TAttributesMap
	/**
	 * Годится ли текст для набора: частичное число в формате поля — минус, только
	 * если `signed`, десятичный разделитель — у формата с дробью
	 */
	acceptsText(text: string): boolean
	/**
	 * Набранный текст: годится — он в поле, а пока он число — и в значении
	 * (недописанное, `-`, — пусто). Не годится, выключено или только для чтения
	 * — ничего, `false`
	 */
	typeText(text: string): boolean
	/**
	 * Шаг: на `count` шагов шкалы — первый к соседнему узлу (с 2,5 вверх на 3);
	 * с пустого — вверх к `min`, вниз к `max`, без границы — 0. У края в сторону
	 * края шага нет. Действие не закрывает: удержание шагает подряд
	 */
	shift(count: number): void
	/** Home и End: к заданной границе; границы нет — ничего */
	moveToEdge(edge: TNumberInputEdge): void
	/**
	 * Закрыть действие: значение — с точностью формата, видимым числом, текст —
	 * строкой формата; `commit`, если действие сменило значение
	 */
	commit(): void
}
