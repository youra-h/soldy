import { TActionEvent } from '../../../common'
import type { ICloseRequestable, TCloseReason } from './types'

/**
 * Запрос закрытия слоя пользователем — аргумент `close:before`.
 *
 * `TActionEvent` с причиной: подписчик видит, чем закрывают слой, и оставляет
 * его открытым `preventDefault()` — например, пока в форме окна есть
 * несохранённое. Причину он может и разобрать: отменить закрытие нажатием
 * мимо, но пропустить Escape.
 */
export class TCloseEvent extends TActionEvent {
	constructor(readonly reason: TCloseReason) {
		super()
	}
}

/**
 * Принимает ли владелец запрос закрытия (`ICloseRequestable`).
 *
 * Плагины слоя берут владельца рефлексией (`ctx.getInstance`) и конкретного
 * класса ядра не требуют. Запрос для них — возможность, а не обязанность:
 * есть он у владельца — закрывают запросом с причиной, нет — записью
 * открытости. Тип-гард рядом с контрактом, как `isEventSource` рядом с
 * эмиттером.
 */
export function isCloseRequestable(value: unknown): value is ICloseRequestable {
	return (
		typeof value === 'object' &&
		value !== null &&
		'requestClose' in value &&
		typeof value.requestClose === 'function'
	)
}
