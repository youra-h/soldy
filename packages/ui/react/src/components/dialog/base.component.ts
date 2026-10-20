import type { IDialog } from '@soldy-ui/core'
import type { DialogDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Dialog (core + плагины), выведены из дескриптора автоматически. */
export type DialogEventProps = EventProps<typeof DialogDescriptor>

/**
 * Пропсы Dialog. Атрибуты — панели: корень окна — она, подложка — её сосед в
 * телепорте, и атрибутов потребителя у подложки нет.
 */
export type DialogProps = UseDomProps<typeof DialogDescriptor, IDialog, DialogEventProps>
