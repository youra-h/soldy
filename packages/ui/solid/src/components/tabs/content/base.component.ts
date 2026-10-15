import type { ITabsContent } from '@soldy-ui/core'
import type { TabsCollectionContentDescriptor, TabsContentDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События панели — свои (ядро и плагины) и фасада: активность связанного таба. */
export type TabsContentEventProps = EventProps<typeof TabsContentDescriptor> &
	EventProps<typeof TabsCollectionContentDescriptor>

/** Пропсы панели: `value` связывает её с табом того же значения. */
export type TabsContentProps = UseDomProps<
	typeof TabsContentDescriptor,
	ITabsContent,
	TabsContentEventProps
>
