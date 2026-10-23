import type { ITabsContent } from '@soldy-ui/core'
import type { TabsCollectionContentDescriptor, TabsContentDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

export type TabsContentEventProps = EventProps<typeof TabsContentDescriptor> &
	EventProps<typeof TabsCollectionContentDescriptor>

export type TabsContentProps = UseDomProps<
	typeof TabsContentDescriptor,
	ITabsContent,
	TabsContentEventProps
>
