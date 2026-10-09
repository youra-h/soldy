import type { IVirtual } from '@soldy-ui/core'
import type { VirtualDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/** События Virtual (ядро), выведены из дескриптора автоматически: выключатель окна и набор. */
export type VirtualEventProps = EventProps<typeof VirtualDescriptor>

/**
 * Пропсы Virtual — `UseProps`, без атрибутов DOM: своего узла у обёртки нет,
 * и класс, стиль или `id` положить некуда.
 */
export type VirtualProps = UseProps<typeof VirtualDescriptor, IVirtual, VirtualEventProps>
