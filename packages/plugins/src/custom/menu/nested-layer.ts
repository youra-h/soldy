import type { TDismissPlugin } from '../dismiss'

/**
 * Держит ли вложенный слой меню фокус — подменю или панель пункта с панелью:
 * фокус в нём по правилу его `TDismissPlugin` (строка пункта, панель и слои
 * над ней) или нигде.
 *
 * Модели фокуса таких слоёв по нему решают, возвращать ли фокус на строку
 * пункта при закрытии (`_returnsFocus`). Слой, закрытый вместе с меню, фокус
 * на строку спрятанной панели не тянет: меню уже вернуло его на триггер, — а
 * подписчики открытости меню и слоя идут в любом порядке, и правило держит
 * оба.
 */
export function holdsFocus(root: Element, dismiss: TDismissPlugin | null): boolean {
	const doc = root.ownerDocument
	const active = doc.activeElement

	if (!active || active === doc.body || active === doc.documentElement) return true

	return dismiss?.isInside(active) ?? false
}
