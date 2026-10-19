import type { TComponentEntry } from './types'

/** Экземпляр ядра со стороны стенда: пишем свойства, зовём `destroy`. */
export type TInstance = Record<string, unknown> & { destroy?: () => void }

/** Пропсы конструктора экземпляра — по имени свойства. */
export type TInstanceProps = Readonly<Record<string, unknown>>

/**
 * Экземпляр ядра по записи реестра.
 *
 * Один на всех, кто держит компонент через `ctrl`: вторую колонку страницы
 * свойств и раннер сценариев. Пока функция жила в строке свойств, раннеру
 * пришлось бы завести свою копию, и способ создания разошёлся бы молча.
 *
 * `props` — пропсы конструктора, как у `new TButton({ text })` в приложении:
 * так строка отдаёт экземпляру значение превью своего пропа. Разметкой рядом с
 * `ctrl` его не отдать: её сборка пишет экземпляру при каждом монтировании, и
 * смена фреймворка вернула бы ему значение превью поверх набранного.
 *
 * `ctor` в дескрипторе объявлен как `any` — точнее его там не выразить: это
 * класс любого компонента ядра. Сужаем до «конструктор объекта со свойствами»,
 * чего для записи пропа достаточно.
 */
export function createInstance(entry: TComponentEntry, props: TInstanceProps = {}): TInstance {
	const Ctor = entry.descriptor().ctor as new (props: TInstanceProps) => TInstance

	return new Ctor(props)
}
