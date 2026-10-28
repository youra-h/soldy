/**
 * Options of the Tabs panel's binding to its tab: the panel's adapter and the lift to the owner's engine.
 */

import type { ITabsContent } from '@soldy-ui/core'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'
import type { TMemberAdapter } from '../collection'

export interface ITabsContentBindingOptions {
	/** The panel's own context: its instance (TTabsContent) is the source of `value`. */
	adapter: TMemberAdapter<ITabsContent>
	elevator: TElevatorFactory
}
