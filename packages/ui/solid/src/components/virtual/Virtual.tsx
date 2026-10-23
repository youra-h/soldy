import type { JSX } from 'solid-js'
import { Elevate, renderSlot } from '../../adapter'
import { setupVirtual } from './setup.component'
import type { VirtualProps } from './base.component'

/** Окно для длинных списков: коллекции внутри рисуют только видимое; своего узла нет. */
export function Virtual(props: VirtualProps): JSX.Element {
	const binding = setupVirtual(props)

	return <Elevate layer={binding.layer}>{renderSlot(props.children)}</Elevate>
}
