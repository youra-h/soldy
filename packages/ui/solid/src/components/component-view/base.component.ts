import type { IComponentView } from '@soldy-ui/core'
import type { ComponentViewDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя ComponentView (core + плагины), выведены из дескриптора автоматически. */
export type ComponentViewEventProps = EventProps<typeof ComponentViewDescriptor>

export type ComponentViewProps = UseDomProps<
	typeof ComponentViewDescriptor,
	IComponentView,
	ComponentViewEventProps
>
