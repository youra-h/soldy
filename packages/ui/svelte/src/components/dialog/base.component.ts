import type { IDialog } from '@soldy-ui/core'
import type { DialogDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type DialogEventProps = EventProps<typeof DialogDescriptor>

/** Атрибуты — панели: подложка — её сосед без экземпляра. */
export type DialogProps = UseDomProps<typeof DialogDescriptor, IDialog, DialogEventProps>
