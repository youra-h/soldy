/**
 * Метка слота детали — помощники шаблона владельца.
 *
 * Деталь шаблона (кнопка, поле) раскладывает свой свет сама, когда
 * собирается, — после владельца, — и обёртку слота строит, только когда в
 * слот есть что положить. Метка (`lendMark`) — пустой комментарий в слоте
 * детали: слот с ней задан и пустым, и её место — место узлов владельца в этом
 * слоте (`runtime/slot-mark.ts`). Поле Select получает метку в `leading`:
 * обёртка `.so-input__leading` стоит и в `single`, а теги в `multiple` встают
 * перед меткой, когда появятся. Кнопка разворота окна — метку в слоте по
 * умолчанию: значок встаёт перед ней по состоянию окна.
 *
 * Узел перед меткой (`lendBefore`) встаёт туда, где метка сейчас: до сборки
 * детали — в её свет, с назначением слота метки (`assignment.ts`), чтобы
 * деталь разложила его в тот же слот и перед меткой, а после — в слот прямо.
 * Назначение тому же узлу ставится и после сборки, как у точки базы перед
 * меткой (`TSlotTarget` с `before` и `slot`): узел, который владелец снял и
 * вернул, встаёт одним и тем же вызовом.
 */

import { assignSlot } from '../runtime/assignment'
import { markSlot, slotOfMark } from '../runtime/slot-mark'
import { lend } from './lend'

/**
 * Метка в слот `slot` детали — последним её узлом. Слот с меткой деталь
 * считает заданным и пустым, узлы владельца встают перед меткой.
 */
export function lendMark(detail: Element, slot: string): Comment {
	const mark = detail.ownerDocument.createComment('')

	markSlot(mark, slot)
	lend(detail, slot, mark)

	return mark
}

/** Узел — перед меткой, в её слот: и до сборки детали, и после (см. шапку). */
export function lendBefore(mark: Comment, node: Node): void {
	const slot = slotOfMark(mark)

	if (slot !== undefined) assignSlot(node, slot)

	mark.parentNode?.insertBefore(node, mark)
}
