/**
 * common — поведение, одинаковое во всех фреймворк-адаптерах.
 *
 * Адаптер должен реализовывать только то, что действительно различается:
 * naming для событий и способ доставки значений во view-слой фреймворка.
 */

export { underscorePropNaming, callbackEventNaming } from './naming'
export type { TCallbackEventName, TCallbackEventProps } from './naming.types'
export { createInspectorFactory, type TCreateInspector } from './createInspector'
export { collectEventBindings, type IEventBinding } from './collectEventBindings'
