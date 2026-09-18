/**
 * defineType — тип пропа в декларации: конструктор для рантайма, `T` для типов.
 *
 *   view: { type: defineType<TButtonView>(String), triggers: ['change:view'] }
 *
 * Фреймворку нужен конструктор (`String`), адаптерам в типах — точный тип
 * значения (`TButtonView`). Один вызов несёт оба.
 */

import type { TPropType } from './types'

export function defineType<T>(ctor: unknown): TPropType<T> {
	return { ctor }
}
