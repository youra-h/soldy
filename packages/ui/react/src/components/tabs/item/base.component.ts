import type { HTMLAttributes } from 'react'
import type { ITabsItem } from '@soldy-ui/core'
import type { TabsCollectionItemDescriptor, TabsItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** События таба — свои и фасада. */
export type TabsItemEventProps = EventProps<typeof TabsItemDescriptor> &
	EventProps<typeof TabsCollectionItemDescriptor>

/** Атрибуты таба: класс и стиль — корню, остальное — строке с `role="tab"`. */
export type TabsItemAttributes = TDomAttributes<
	typeof TabsItemDescriptor,
	HTMLAttributes<HTMLElement>,
	TabsItemEventProps
>

export type TabsItemProps = UseDomProps<typeof TabsItemDescriptor, ITabsItem, TabsItemEventProps>
