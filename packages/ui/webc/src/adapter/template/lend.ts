/**
 * Разметка шаблона владельца — в слот детали или элемента из данных. Деталь
 * собирается после владельца и раскладывает свет сама, поэтому владелец не
 * лезет в её структуру, а отдаёт узлы светом с назначенным слотом. AGENTS.md
 * (Web Components), «Свет детали».
 */

import { assignSlot, markSlot, slotOfMark } from '../runtime/marks'

export type TLendAt = 'end' | 'start'

/** Узел или все дети фрагмента — в слот `slot` детали, последними или первыми. */
export function lend(detail: Element, slot: string, content: Node, at: TLendAt = 'end'): void {
	const nodes = content instanceof DocumentFragment ? [...content.childNodes] : [content]

	for (const node of nodes) assignSlot(node, slot)

	if (at === 'start') detail.prepend(...nodes)
	else detail.append(...nodes)
}

/** Метка — слот детали задан и пустым, узлы владельца встают перед ней (`lendBefore`). */
export function lendMark(detail: Element, slot: string): Comment {
	const mark = detail.ownerDocument.createComment('')

	markSlot(mark, slot)
	lend(detail, slot, mark)

	return mark
}

/** Перед меткой, в её слот — одним вызовом и до сборки детали, и после. */
export function lendBefore(mark: Comment, node: Node): void {
	const slot = slotOfMark(mark)

	if (slot !== undefined) assignSlot(node, slot)

	mark.parentNode?.insertBefore(node, mark)
}
