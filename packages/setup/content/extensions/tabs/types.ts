/**
 * Опции связки панели Tabs с табом: панель и лифт к движку владельца.
 */

import type { ITabsContent } from '@soldy-ui/core'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'

export interface ITabsContentBindingOptions {
	/** Инстанс панели (TTabsContent) — источник `value`. */
	content: ITabsContent
	elevator: TElevatorFactory
}
