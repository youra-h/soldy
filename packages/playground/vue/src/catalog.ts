import { COMPONENTS } from '@soldy/playground-shared'
import { PREVIEW_COMPONENTS } from './previews'

/**
 * Что этот адаптер умеет показать.
 *
 * Реестр в `@soldy/playground-shared` — каталог **библиотеки**, он одинаков для
 * всех шести стендов. Но адаптеры дорастают до него по очереди: компоненты
 * сначала пишутся на Vue, обкатываются, и только потом переносятся дальше — в
 * React сейчас два компонента из двадцати.
 *
 * Поэтому меню и витрина показывают пересечение каталога с картой превью. Чего
 * адаптер не реализовал — того в меню нет, вместо восемнадцати пунктов, ведущих
 * в пустоту. Обратное тоже верно: появился компонент в `previews` — страница
 * возникает сама, править список не нужно.
 */
export const AVAILABLE = COMPONENTS.filter((entry) => entry.id in PREVIEW_COMPONENTS)

/** Готовые компоненты — они и попадают на витрину. */
export const SHOWCASE = AVAILABLE.filter((entry) => entry.showcase)

/** Слои наследования: страница есть, на витрине им делать нечего. */
export const LAYERS = AVAILABLE.filter((entry) => !entry.showcase)

export function findAvailable(id: string) {
	return AVAILABLE.find((entry) => entry.id === id)
}
