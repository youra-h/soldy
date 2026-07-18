/**
 * @soldy/host — runtime/RuntimeProvider.ts
 *
 * Расширенный провайдер: свойства + события.
 * Наследует AccessorProvider и добавляет подписку на события.
 */

import type { TEventHandler } from '@soldy/core'
import type { AccessorProvider } from './AccessorProvider'

export interface RuntimeProvider extends AccessorProvider {
	/**
	 * Подписаться на событие.
	 * Возвращает функцию отписки или undefined если событие не обрабатывается.
	 */
	subscribe?(event: string, handler: TEventHandler): (() => void) | undefined
}
