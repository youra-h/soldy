import type { IDialog } from '@soldy-ui/core'
import type { DialogDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Dialog (ядро и плагины), выведены из дескриптора автоматически. */
export type DialogEventProps = EventProps<typeof DialogDescriptor>

/**
 * Пропсы Dialog. Атрибуты — панели: корень окна — она, а подложка — её сосед
 * без экземпляра.
 */
export type DialogProps = UseDomProps<typeof DialogDescriptor, IDialog, DialogEventProps>
