import type { TPluginEvents } from '../../../base'

/**
 * Ссылки контрола на части поля — то, что поле даёт `aria` своего контрола.
 *
 * Пары «есть / нет»: части без текста в разметке нет, и ссылки на неё нет
 * тоже — иначе контрол ссылался бы на `id`, которого в документе нет.
 */
export interface IFieldLinks {
	/** `id` подписи — пока она рисуется (задан её текст) */
	readonly labelledBy?: string
	/** `id` видимой справки: ошибки, а без неё — подсказки */
	readonly describedBy?: string
}

/**
 * Что контрол сообщает о себе полю, когда его приняли: по этому плагин решает
 * `for` подписи.
 */
export interface IFieldControlInfo {
	/** `id` поля контрола — свой или заданный полем; у контрола без `id` — `undefined` */
	readonly id: string | undefined
	/** Labelable ли элемент с `aria`: группу `for` подписи не называет */
	readonly labelable: boolean
}

export type TFieldIdsPluginEvents = TPluginEvents & {
	/** change:links — ссылки контрола на части сменились: появилась, пропала или сменилась часть */
	'change:links': (links: IFieldLinks) => void
}
