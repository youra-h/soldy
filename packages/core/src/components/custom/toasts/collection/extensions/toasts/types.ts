import type { IExtension } from '../../../../../base/collection'
import type { TComponentVariant } from '../../../../../../common'
import type { IToasts } from '../../../types'
import type { IToastsItem } from '../../../item/types'

/**
 * Опции тоста для `show`.
 *
 * `TRender` — тип своего содержимого (`render`). Ядро его не читает, поэтому
 * здесь он `unknown`, а адаптер сужает его своим API: во Vue это компонент,
 * которому тост приходит пропом `toast`.
 */
export interface IToastOptions<TRender = unknown> {
	/** Текст тоста — его заголовок */
	text?: string
	/** Описание под текстом */
	description?: string
	/** Вариант темы — цвет тоста. Не задан — тост нейтральный */
	variant?: TComponentVariant
	/** Есть ли у тоста кнопка закрытия. По умолчанию есть */
	closable?: boolean
	/** Сколько тост держится, мс. Не задано — как у владельца, `0` — пока не закроют */
	duration?: number
	/** Срочное сообщение: `role="alert"` вместо `role="status"` */
	alert?: boolean
	/** Своё содержимое под текстом: кнопка «Отменить» и подобное */
	render?: TRender
}

/** Что принимает `show`: текст тоста или его опции. */
export type TToastInput<TRender = unknown> = string | IToastOptions<TRender>

/**
 * API тостов — то, что приложение зовёт из кода: `const { show } = useToasts()`.
 *
 * `show` — поле со стрелкой, а не метод: деструктуризация не теряет `this`.
 * Возвращает тост — экземпляр ядра, его можно поправить или закрыть
 * (`toast.close()`); вставку отменили (`item:add:before`) — `undefined`.
 */
export interface IToastsApi<TRender = unknown> {
	readonly show: (input: TToastInput<TRender>) => IToastsItem | undefined
}

/** Опции движка Toasts: владелец приходит и уходит после сборки. */
export type TToastsEngineOptions<TOwner extends IToasts = IToasts> = {
	owner: TOwner
}

/** События расширения `toasts`. */
export type TToastsExtensionEvents = {
	/** Тост закрылся. Закрытие окончательное, поэтому приходит один раз */
	'item:close': (toast: IToastsItem) => void
	/**
	 * Длительность тоста (`durationOf`) сменилась: его своя или, у тоста без
	 * своей, владельца
	 */
	'item:duration': (toast: IToastsItem) => void
}

/** Контракт расширения тостов: очередь, предел видимых, длительность и сторона жеста. */
export interface IToastsExtension
	extends IExtension<IToastsItem, TToastsExtensionEvents>, IToastsApi {
	/** Длительность тоста, мс: своя, а если её нет — владельца. `0` — не закрывается сам */
	durationOf(toast: IToastsItem): number
}
