/**
 * Опции проводки группы переключателей меню и её переключателей.
 */

import type { TElevatorFactory } from '../../../protected/adapter/elevator'

export interface IMenuRadioGroupExtensionOptions {
	elevator: TElevatorFactory
}

export interface IMenuRadioItemExtensionOptions {
	elevator: TElevatorFactory
}
