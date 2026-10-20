import type { JSX } from 'solid-js'
import { Elevate, renderSlot } from '../../adapter'
import { setupDragAndDrop } from './setup.component'
import type { DragAndDropProps } from './base.component'

/**
 * DragAndDrop — перестановка элементов коллекций перетаскиванием: элементы
 * Tabs, ListBox и Accordion внутри переставляют жестом, а о перестановке
 * сообщают события обёртки — `onMoveBefore` (отмена — `preventDefault()`) и
 * `onMove`.
 *
 * Своего узла у обёртки нет, как у Vue и React: разметка — только дети, в
 * слое лифта обёртки (`Elevate`). По нему проводка обёртки опускает
 * коллекциям свой экземпляр, а коллекция подхватывает его своей сборкой. Узлы
 * детей Solid создаёт там, где развернули слот, поэтому слот разворачивается
 * внутри `Elevate`: развёрнутый в теле обёртки, он собрал бы коллекции вне её
 * слоя.
 */
export function DragAndDrop(props: DragAndDropProps): JSX.Element {
	const binding = setupDragAndDrop(props)

	return <Elevate layer={binding.layer}>{renderSlot(props.children)}</Elevate>
}
