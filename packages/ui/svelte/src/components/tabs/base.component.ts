import type { ITabs } from '@soldy-ui/core'
import type { TabsCollectionDescriptor, TabsDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../types'

export type TabsEventProps = EventProps<typeof TabsDescriptor> &
	EventProps<typeof TabsCollectionDescriptor>

/** Атрибуты набора: класс и стиль — корню, остальное — списку табов с `role="tablist"`. */
export type TabsAttributes = TDomAttributes<typeof TabsDescriptor, TabsEventProps>

export type TabsProps = UseDomProps<typeof TabsDescriptor, ITabs, TabsEventProps>
