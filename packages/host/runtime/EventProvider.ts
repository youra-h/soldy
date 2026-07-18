/**
 * @soldy/host — runtime/EventProvider.ts
 *
 * Расширенный провайдер: свойства + события.
 * Наследует AccessorProvider и добавляет подписку на события.
 */

import type { TEventHandler } from '@soldy/core'
import type { AccessorProvider } from './AccessorProvider'

export interface EventProvider extends AccessorProvider {
	/**
	 * Подписаться на событие.
	 * Возвращает функцию отписки или undefined если событие не обрабатывается.
	 */
	subscribe(event: string, handler: TEventHandler): (() => void) | undefined
}
