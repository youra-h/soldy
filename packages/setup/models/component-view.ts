import { compileComponent } from '@soldy/provider'
import { ComponentContribution } from '../contributions/core/component'
import { ComponentViewContribution } from '../contributions/core/component-view'
import { ElementContribution } from '../contributions/plugins/element'
import { InstanceContribution } from '../contributions/plugins/instance'

export const componentViewModel = compileComponent(
	[ComponentContribution, ComponentViewContribution, ElementContribution, InstanceContribution],
	['ready'],
)

