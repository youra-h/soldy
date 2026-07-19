import { compileComponent } from '@soldy/provider'
import { componentModel } from './component'
import { ComponentViewContribution } from '../contributions'
import { ElementContribution, InstanceContribution } from '../../plugins'

export const componentViewModel = compileComponent([
	componentModel,
	ComponentViewContribution,
	ElementContribution,
	InstanceContribution,
])
