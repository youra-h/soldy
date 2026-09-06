/**
 * common — поведение, одинаковое во всех фреймворк-адаптерах.
 *
 * Адаптер должен реализовывать только то, что действительно различается:
 * naming для событий и способ доставки значений во view-слой фреймворка.
 */

export { defaultPropNaming } from './naming'
export { createInspectorFactory, type TCreateInspector } from './createInspector'
export { collectEventBindings, type IEventBinding } from './collectEventBindings'
