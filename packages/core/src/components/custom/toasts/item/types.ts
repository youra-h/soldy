import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../../base/component-view'
import type { ISwipeable, TSwipeableEvents, TSwipeSide } from '../../../base/layer'
import type { ICloseRequestable } from '../../../base/layer'
import type { TAria, TAriaAttributes, TChangeEvent, TValuePayload } from '../../../../common'

/**
 * Вид сообщения тоста — что случилось: сведения (`info`), успех (`success`),
 * предупреждение (`warning`) или ошибка (`error`). Не задан — обычное
 * сообщение.
 *
 * Значок по виду выбирает разметка — роль иконки, своя у каждого вида, — а тема
 * только красит его по модификатору `--type-<v>`. Смысл у вида один в любой
 * теме, поэтому это union ядра, как `type` у Tooltip, а не реестр темы, как
 * `variant`: имён вариантов библиотека не знает, и выбрать по ним значок не
 * смогла бы.
 */
export type TToastsItemType = 'info' | 'success' | 'warning' | 'error'

export type TToastsItemEvents = TComponentViewEvents &
	TSwipeableEvents & {
		/** change:text */
		'change:text': (payload: TValuePayload<string>) => void
		/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
		'change:text:before': (e: TChangeEvent<string>) => void
		/** change:description */
		'change:description': (value: string) => void
		/** change:type — вид сообщения; `undefined` — обычное */
		'change:type': (value: TToastsItemType | undefined) => void
		/** change:loading — тост ждёт или ожидание снято */
		'change:loading': (value: boolean) => void
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

export interface IToastsItemProps extends IComponentViewProps {
	/** Текст тоста — его заголовок */
	text?: string
	/** Описание под текстом */
	description?: string
	/**
	 * Вид сообщения: `info`, `success`, `warning` или `error` — значок вида в
	 * начале строки. Не задан — обычное сообщение
	 */
	type?: TToastsItemType
	/**
	 * Тост ждёт — идёт работа, о которой он сообщает («Сохраняем…»): на месте
	 * значка бежит кольцо, при любом виде, и сам тост не закрывается. Снятое
	 * ожидание начинает отсчёт заново
	 */
	loading?: boolean
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
	extends IComponentView<TProps, TEvents>, ISwipeable, ICloseRequestable {
	/** Текст тоста — его заголовок */
	text: string
	/** Описание под текстом */
	description: string
	/** Вид сообщения; `undefined` — обычное сообщение */
	type: TToastsItemType | undefined
	/** Тост ждёт: на месте значка кольцо, и сам тост не закрывается */
	loading: boolean
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
