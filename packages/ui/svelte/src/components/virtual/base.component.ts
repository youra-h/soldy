import type { IVirtual } from '@soldy-ui/core'
import type { VirtualDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

export type VirtualEventProps = EventProps<typeof VirtualDescriptor>

/** Без атрибутов и `ref`: своего узла у обёртки нет. */
export type VirtualProps = UseProps<typeof VirtualDescriptor, IVirtual, VirtualEventProps>
