import type { IDrawer } from '@soldy-ui/core'
import type { DrawerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Drawer (core + плагины), выведены из дескриптора автоматически. */
export type DrawerEventProps = EventProps<typeof DrawerDescriptor>

/**
 * Пропсы Drawer. Атрибуты — панели: корень выезжающей панели — она, подложка
 * — её сосед, и атрибутов потребителя у подложки нет.
 */
export type DrawerProps = UseDomProps<typeof DrawerDescriptor, IDrawer, DrawerEventProps>
