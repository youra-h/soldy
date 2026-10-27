/**
 * Options of the Tabs panel's binding to its tab: the panel and the lift to the owner's engine.
 */

import type { ITabsContent } from '@soldy-ui/core'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'
import type { TCollectionMember } from '../collection'

export interface ITabsContentBindingOptions {
	/**
	 * The panel's own context: its instance (TTabsContent) is the source of
	 * `value`, and the collection detaches it with itself.
	 */
	content: TCollectionMember<ITabsContent>
	elevator: TElevatorFactory
}
