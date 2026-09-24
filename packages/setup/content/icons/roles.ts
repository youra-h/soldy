/**
 * Роли, которые компоненты библиотеки требуют от пакета иконок.
 *
 * Пакет иконок — не мешок SVG, а **реализация контракта**: список ролей,
 * которые нужны компонентам. Ровно как тема реализует те классы, которые
 * soldy выпускает в разметку. Поэтому роли перечислены явно, а
 * conformance-тест проверяет, что пакет закрывает их все.
 *
 * Список — наполнение, а не механика: появилась иконка в новом компоненте —
 * роль дописывается сюда. Реестр (`protected/registry/icons.ts`) о списке не
 * знает и работает с любой строкой, поэтому новая роль не трогает движок.
 */

import type { TIconSource } from '../../protected/registry'

/**
 * Список закрытый: он и есть контракт. Появилась иконка в новом компоненте —
 * роль добавляется сюда, и conformance-тест сразу покажет, какие пакеты её
 * ещё не закрыли.
 */
export const ICON_ROLES = [
	'check',
	'checkIndeterminate',
	'close',
	'arrowDown',
	'arrowRight',
	'moreHoriz',
	// Кнопка разворота модального окна: стрелки наружу — развернуть, внутрь —
	// вернуть размер
	'arrowsOutward',
	'arrowsInward',
] as const

export type TIconRole = (typeof ICON_ROLES)[number]

/** Пакет иконок: все обязательные роли плюс любые собственные. */
export type TIconPack = Record<TIconRole, TIconSource> & Record<string, TIconSource>

/**
 * Каких обязательных ролей не хватает в наборе.
 *
 * Основа conformance-теста пакета: пустой массив означает, что контракт
 * закрыт целиком.
 */
export function missingIconRoles(pack: Partial<Record<string, TIconSource>>): TIconRole[] {
	return ICON_ROLES.filter((role) => !pack[role])
}
