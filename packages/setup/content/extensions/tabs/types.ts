/**
 * Options of the Tabs panel's binding to its tab: the panel and the lift to the owner's engine.
 */

import type { ITabsContent } from '@soldy-ui/core'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'
import type { IDetachable } from '../collection/types'

export interface ITabsContentBindingOptions {
	/** The panel instance (TTabsContent): the source of `value`. */
	content: ITabsContent
	/** The panel's own context: the collection detaches it with itself. */
	member: IDetachable
	elevator: TElevatorFactory
}
