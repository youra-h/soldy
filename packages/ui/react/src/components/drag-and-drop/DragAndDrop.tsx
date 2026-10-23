import type { ReactElement } from 'react'
import { Elevate, renderSlot } from '../../adapter'
import { useSetupDragAndDrop } from './setup.component'
import type { DragAndDropProps } from './base.component'

/** DragAndDrop — перестановка элементов коллекций жестом; своего узла нет, только слой лифта. */
export function DragAndDrop(props: DragAndDropProps): ReactElement {
	const { layer } = useSetupDragAndDrop(props)

	return <Elevate layer={layer}>{renderSlot(props.children)}</Elevate>
}
