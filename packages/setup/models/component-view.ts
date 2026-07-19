import { compileComponent } from '@soldy/provider'
import { componentModel } from './component'
import { ComponentViewContribution } from '../contributions/core/component-view'
import { ElementContribution } from '../contributions/plugins/element'
import { InstanceContribution } from '../contributions/plugins/instance'

export const componentViewModel = compileComponent([
	componentModel,
	ComponentViewContribution,
	ElementContribution,
	InstanceContribution,
])
