import type { ILabel } from '@soldy-ui/core'
import type { LabelDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Label (core + плагины), выведены из дескриптора автоматически. */
export type LabelEventProps = EventProps<typeof LabelDescriptor>

export type LabelProps = UseDomProps<typeof LabelDescriptor, ILabel, LabelEventProps>
