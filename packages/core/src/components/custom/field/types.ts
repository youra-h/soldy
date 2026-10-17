import type { TAria, TAriaAttributes } from '../../../common'
import type { IStylable, IStylableProps, TStylableEvents } from '../../base/stylable'

/**
 * С какой стороны от контрола стоит подпись поля.
 *
 * `top` — над контролом, `start` и `end` — в строке с ним. Смысл у значения
 * один в любой теме, поэтому это union ядра, а не реестр темы. `start` и `end`
 * — логические: в RTL подпись сама встаёт с другой стороны.
 */
export type TFieldPosition = 'top' | 'start' | 'end'

export type TFieldEvents = TStylableEvents & {
	/** change:label */
	'change:label': (value: string) => void
	/** change:helper */
	'change:helper': (value: string) => void
	/** change:error */
	'change:error': (value: string) => void
	/** change:invalid */
	'change:invalid': (value: boolean) => void
	/** change:position */
	'change:position': (value: TFieldPosition) => void
	/** change:labelAria — набор атрибутов подписи изменился */
	'change:labelAria': (value: TAriaAttributes) => void
	/** change:helperAria — набор атрибутов подсказки изменился */
	'change:helperAria': (value: TAriaAttributes) => void
	/** change:errorAria — набор атрибутов ошибки изменился */
	'change:errorAria': (value: TAriaAttributes) => void
}

export interface IFieldProps extends IStylableProps {
	/** Подпись — видимое имя контрола. Пусто — подписи нет. Слот `label-content` её переопределяет */
	label?: string
	/** Подсказка под контролом. Пусто — подсказки нет; пока видна ошибка, подсказки нет тоже */
	helper?: string
	/** Текст ошибки — виден, пока поле невалидно (`invalid`). Пусто — ошибки не видно */
	error?: string
	/** Значение поля неверно: ошибка видна, контрол помечен ошибкой. Проверку делает приложение */
	invalid?: boolean
	/** С какой стороны от контрола стоит подпись */
	position?: TFieldPosition
}

export interface IField extends IStylable<IFieldProps, TFieldEvents> {
	/** Подпись — видимое имя контрола */
	label: string
	/** Подсказка под контролом */
	helper: string
	/** Текст ошибки */
	error: string
	/** Значение поля неверно */
	invalid: boolean
	/** С какой стороны от контрола стоит подпись */
	position: TFieldPosition
	/** Рисовать ли подсказку: текст есть, а ошибки не видно */
	readonly helperRendered: boolean
	/** Рисовать ли ошибку: поле невалидно, и текст ошибки есть */
	readonly errorRendered: boolean
	/** Атрибуты подписи: `id` и `for` пишет плагин связок */
	readonly labelAria: TAria
	/** Атрибуты подсказки: `id` пишет плагин связок */
	readonly helperAria: TAria
	/** Атрибуты ошибки: `id` пишет плагин связок */
	readonly errorAria: TAria
}
