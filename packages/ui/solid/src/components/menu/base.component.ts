import type { IMenu } from '@soldy-ui/core'
import type { MenuCollectionDescriptor, MenuDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Menu — свои и фасада коллекции. */
export type MenuEventProps = EventProps<typeof MenuDescriptor> &
	EventProps<typeof MenuCollectionDescriptor>

/** Пропсы Menu; атрибуты потребителя — корню, обёртке триггера. */
export type MenuProps = UseDomProps<typeof MenuDescriptor, IMenu, MenuEventProps>
