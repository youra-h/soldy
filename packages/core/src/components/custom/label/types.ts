import type { TChangeEvent, TValuePayload } from '../../../common'
import type { IStylable, IStylableProps, TStylableEvents } from '../../base/stylable'

/**
 * С какой стороны от контрола стоит текст подписи.
 *
 * Смысл у значения один в любой теме, поэтому это union ядра, а не реестр
 * темы. `start` и `end` — логические: в RTL текст сам встаёт с другой
 * стороны.
 */
export type TLabelPosition = 'start' | 'end' | 'top' | 'bottom'

export type TLabelEvents = TStylableEvents & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
	'change:text:before': (e: TChangeEvent<string>) => void
	/** change:position */
	'change:position': (value: TLabelPosition) => void
}

export interface ILabelProps extends IStylableProps {
	/** Текст подписи. Слот `content` его переопределяет */
	text?: string
	/** С какой стороны от контрола стоит текст */
	position?: TLabelPosition
}

export interface ILabel extends IStylable<ILabelProps, TLabelEvents> {
	/** Текст подписи */
	text: string
	/** С какой стороны от контрола стоит текст */
	position: TLabelPosition
}
