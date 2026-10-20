import type { IDrawer } from '@soldy-ui/core'
import type { DrawerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Drawer (ядро и плагины), выведены из дескриптора автоматически. */
export type DrawerEventProps = EventProps<typeof DrawerDescriptor>

/**
 * Пропсы Drawer. Атрибуты — панели: корень выезжающей панели — она, а
 * подложка — её сосед без экземпляра.
 */
export type DrawerProps = UseDomProps<typeof DrawerDescriptor, IDrawer, DrawerEventProps>
