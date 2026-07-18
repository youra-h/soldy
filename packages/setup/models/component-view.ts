/**
 * @soldy/setup — models/component-view.ts
 *
 * Скомпилированная модель TComponentView.
 * Готова к использованию в любом UI-фреймворке.
 */

import { compileComponent } from '@soldy/provider'
import { ComponentContribution } from '../contributions/core/component'
import { ComponentViewContribution } from '../contributions/core/component-view'
import { ElementContribution } from '../contributions/plugins/element'
import { InstanceContribution } from '../contributions/plugins/instance'

export const componentViewModel = compileComponent(
	[ComponentContribution, ComponentViewContribution, ElementContribution, InstanceContribution],
	['ready'],
)
