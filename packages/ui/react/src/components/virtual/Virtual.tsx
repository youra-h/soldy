import type { ReactElement } from 'react'
import { Elevate, renderSlot } from '../../adapter'
import { useSetupVirtual } from './setup.component'
import type { VirtualProps } from './base.component'

/** Virtual — окно для длинных списков; своего узла нет, только слой лифта. */
export function Virtual(props: VirtualProps): ReactElement {
	const { layer } = useSetupVirtual(props)

	return <Elevate layer={layer}>{renderSlot(props.children)}</Elevate>
}
