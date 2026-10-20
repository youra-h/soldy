import type {
	IInputControl,
	IInputControlProps,
	TInputControlEvents,
} from '../../base/input-control'
import type { TAria, TAriaAttributes } from '../../../common'

/**
 * Набранное у предела `maxlength` — значение `data-limit` корня: `reached` —
 * ровно предел, `exceeded` — больше (значение, заданное кодом, браузер не
 * обрезает). Ниже предела и без него атрибута нет.
 */
export type TTextareaLimit = 'reached' | 'exceeded'

export type TTextareaEvents = TInputControlEvents<string> & {
	/** change:placeholder */
	'change:placeholder': (value: string) => void
	/** change:rows */
	'change:rows': (value: number) => void
	/** change:maxRows */
	'change:maxRows': (value: number) => void
	/** change:maxlength — предел сменился; `undefined` — предела нет */
	'change:maxlength': (value: number | undefined) => void
	/** change:autoresize */
	'change:autoresize': (value: boolean) => void
	/** change:counter */
	'change:counter': (value: boolean) => void
	/** change:counterAria — набор атрибутов счётчика изменился */
	'change:counterAria': (value: TAriaAttributes) => void
}

export interface ITextareaProps extends IInputControlProps<string> {
	/** Подсказка в пустом поле */
	placeholder?: string
	/**
	 * Высота в строках — нативный `rows`. С авторостом — наименьшая высота:
	 * пустое поле не сжимается ниже неё
	 */
	rows?: number
	/**
	 * Потолок автороста в строках: дальше поле прокручивается. `0` — потолка
	 * нет. Ниже `rows` не опускается. Без `autoresize` ничего не меняет
	 */
	maxRows?: number
	/**
	 * Сколько символов можно набрать — нативный `maxlength`: больше браузер
	 * набрать не даст. Значение, заданное кодом, он не обрезает. `undefined` —
	 * предела нет
	 */
	maxlength?: number
	/**
	 * Высота по содержимому: от `rows` до `maxRows`. Нативное поле не растёт,
	 * поэтому — флагом
	 */
	autoresize?: boolean
	/**
	 * Счётчик символов под полем: «набрано / maxlength», без предела — одно
	 * число. Нативное поле символы не считает, поэтому — флагом
	 */
	counter?: boolean
}

export interface ITextarea extends IInputControl<string, ITextareaProps, TTextareaEvents> {
	/** Подсказка в пустом поле */
	placeholder: string
	/** Высота в строках; с авторостом — наименьшая */
	rows: number
	/** Потолок автороста в строках; `0` — потолка нет */
	maxRows: number
	/** Сколько символов можно набрать; `undefined` — предела нет */
	maxlength: number | undefined
	/** Высота по содержимому — от `rows` до `maxRows` */
	autoresize: boolean
	/** Показывать ли счётчик символов */
	counter: boolean
	/**
	 * Атрибуты счётчика: его `id`, на который поле ссылается
	 * `aria-describedby`, пишет плагин связок
	 */
	readonly counterAria: TAria
	/**
	 * Сколько символов набрано — так, как их считает браузер для `maxlength`
	 * (`HTMLTextAreaElement.textLength`): единицы UTF-16, перевод строки —
	 * один символ. По ней ядро ставит `data-limit`, а счётчик показывает
	 * число
	 */
	readonly textLength: number
}
