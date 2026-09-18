import type { TComponentEntry } from './types'

/** Экземпляр ядра со стороны стенда: пишем свойства, зовём `destroy`. */
export type TInstance = Record<string, unknown> & { destroy?: () => void }

/**
 * Экземпляр ядра по записи реестра.
 *
 * Один на всех, кто держит компонент через `ctrl`: вторую колонку страницы
 * свойств и раннер сценариев. Пока функция жила в строке свойств, раннеру
 * пришлось бы завести свою копию, и способ создания разошёлся бы молча.
 *
 * `ctor` в дескрипторе объявлен как `any` — точнее его там не выразить: это
 * класс любого компонента ядра. Сужаем до «конструктор объекта со свойствами»,
 * чего для записи пропа достаточно.
 */
export function createInstance(entry: TComponentEntry): TInstance {
	const Ctor = entry.descriptor().ctor as new () => TInstance

	return new Ctor()
}
