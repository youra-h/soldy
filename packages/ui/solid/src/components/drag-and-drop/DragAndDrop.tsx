import type { JSX } from 'solid-js'
import { Elevate, renderSlot } from '../../adapter'
import { setupDragAndDrop } from './setup.component'
import type { DragAndDropProps } from './base.component'

/** Перестановка элементов коллекций внутри жестом; своего узла нет — только дети в слое лифта. */
export function DragAndDrop(props: DragAndDropProps): JSX.Element {
	const binding = setupDragAndDrop(props)

	return <Elevate layer={binding.layer}>{renderSlot(props.children)}</Elevate>
}
