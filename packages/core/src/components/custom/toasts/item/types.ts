import type { IStylable, IStylableProps, TStylableEvents } from '../../../base/stylable'
import type { ISwipeable, TSwipeableEvents, TSwipeSide } from '../../../base/layer'
import type { ICloseRequestable } from '../../../base/layer'
import type { TAria, TAriaAttributes, TChangeEvent, TValuePayload } from '../../../../common'

export type TToastsItemEvents = TStylableEvents &
	TSwipeableEvents & {
		/** change:text */
		'change:text': (payload: TValuePayload<string>) => void
		/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
		'change:text:before': (e: TChangeEvent<string>) => void
		/** change:description */
		'change:description': (value: string) => void
		/** change:closable */
		'change:closable': (value: boolean) => void
		/** Запись своего `closable` — подправить или отменить (`TChangeEvent`) */
		'change:closable:before': (e: TChangeEvent<boolean>) => void
		/** change:duration — своя длительность тоста; `undefined` — как у владельца */
		'change:duration': (value: number | undefined) => void
		/** change:alert */
		'change:alert': (value: boolean) => void
		/** change:render */
		'change:render': (value: unknown) => void
		/** change:open — тост закрыли. Закрытие окончательное: открытым тост больше не станет */
		'change:open': (value: boolean) => void
		/** change:closeAria — набор атрибутов кнопки закрытия изменился */
		'change:closeAria': (value: TAriaAttributes) => void
	}

export interface IToastsItemProps extends IStylableProps {
	/** Текст тоста — его заголовок */
	text?: string
	/** Описание под текстом */
	description?: string
	/** Есть ли у тоста кнопка закрытия. По умолчанию есть */
	closable?: boolean
	/**
	 * Сколько тост держится на экране, мс. `undefined` — как у владельца,
	 * `0` — держится, пока его не закроют
	 */
	duration?: number
	/**
	 * Срочное сообщение: `role="alert"`, скринридер прерывает речь. Без него —
	 * `role="status"`, вежливое объявление
	 */
	alert?: boolean
	/**
	 * Своё содержимое тоста — под текстом: кнопка «Отменить» и подобное. Ядро
	 * значение не читает: что это и как его нарисовать, знает адаптер (во Vue —
	 * компонент, которому тост приходит пропом `toast`)
	 */
	render?: unknown
}

export interface IToastsItem<
	TProps extends IToastsItemProps = IToastsItemProps,
	TEvents extends TToastsItemEvents = TToastsItemEvents,
>
	extends IStylable<TProps, TEvents>, ISwipeable, ICloseRequestable {
	/** Текст тоста — его заголовок */
	text: string
	/** Описание под текстом */
	description: string
	/** Есть ли у тоста кнопка закрытия */
	closable: boolean
	/** Своя длительность, мс; `undefined` — как у владельца, `0` — не закрывается сам */
	duration: number | undefined
	/** Срочное сообщение: `role="alert"` вместо `role="status"` */
	alert: boolean
	/** Своё содержимое — его рисует адаптер, ядро значение не читает */
	render: unknown
	/** Открыт ли тост. Закрытие окончательное: закрывает `close()` */
	readonly open: boolean
	/** Куда тост уходит жестом — пишет коллекция по месту региона */
	swipeSide: TSwipeSide
	/** Атрибуты кнопки закрытия — живой набор: имя с текстом тоста пишет плагин имён */
	readonly closeAria: TAria
	/** Закрыть тост. Закрытый гаснет и уходит из коллекции, когда доиграл переходы */
	close(): void
}
