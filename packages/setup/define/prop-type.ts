/**
 * defineType — значение scope слота: конструктор для рантайма, `T` — тип данных слота.
 *
 *   default: { scope: { text: defineType<string>(String) } }
 *
 * Из `T` выводится scope слота (`DescriptorSlots`), значение без него не
 * компилируется. У пропа второй записи типа нет: тип значения даёт интерфейс
 * пропсов ядра (`TProps` класса `ctor`), а `type` в contribution — голый
 * конструктор для рантайма (`type: String`).
 */

import type { TPropType } from './types'

export function defineType<T>(ctor: unknown): TPropType<T> {
	return { ctor }
}
