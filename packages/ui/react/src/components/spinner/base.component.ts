import type { ISpinner } from '@soldy-ui/core'
import type { SpinnerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Spinner (core + плагины), выведены из дескриптора автоматически. */
export type SpinnerEventProps = EventProps<typeof SpinnerDescriptor>

export type SpinnerProps = UseDomProps<typeof SpinnerDescriptor, ISpinner, SpinnerEventProps>
