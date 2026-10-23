import type { IDrawer } from '@soldy-ui/core'
import type { DrawerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type DrawerEventProps = EventProps<typeof DrawerDescriptor>

/** Атрибуты — панели: подложка — её сосед без экземпляра. */
export type DrawerProps = UseDomProps<typeof DrawerDescriptor, IDrawer, DrawerEventProps>
