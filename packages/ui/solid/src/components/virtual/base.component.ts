import type { IVirtual } from '@soldy-ui/core'
import type { VirtualDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/** События Virtual, выведены из дескриптора автоматически. */
export type VirtualEventProps = EventProps<typeof VirtualDescriptor>

/** Без атрибутов DOM: своего узла у обёртки нет. */
export type VirtualProps = UseProps<typeof VirtualDescriptor, IVirtual, VirtualEventProps>
