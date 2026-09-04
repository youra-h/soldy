import type { IComponentView } from '@soldy/core'
import type { ComponentViewDescriptor } from '@soldy/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя ComponentView (core + плагины), выведены из дескриптора автоматически. */
export type TComponentViewEventProps = EventProps<typeof ComponentViewDescriptor>

export type ComponentViewProps = UseDomProps<
	typeof ComponentViewDescriptor,
	IComponentView,
	TComponentViewEventProps
>
