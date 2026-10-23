import type { IDialog } from '@soldy-ui/core'
import type { DialogDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Dialog (ядро и плагины). */
export type DialogEventProps = EventProps<typeof DialogDescriptor>

/** Пропсы Dialog. Атрибуты — панели; слот `title` вычитает из атрибутов одноимённый атрибут. */
export type DialogProps = UseDomProps<typeof DialogDescriptor, IDialog, DialogEventProps>
