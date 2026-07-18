/**
 * Скомпилированная модель TComponentView.
 * Используется и для emits/props, и для Runtime.
 */

import { compileComponent } from '@soldy/provider'
import { ComponentContribution, ElementContribution, InstanceContribution } from '@soldy/setup'

export const componentViewModel = compileComponent(
	[ComponentContribution, ElementContribution, InstanceContribution],
	[
		{
			name: 'tag',
			kind: 'state',
			ownerId: ComponentContribution.id,
		},
		{
			name: 'classes',
			kind: 'computed',
			ownerId: ComponentContribution.id,
		},
	],
	['ready'],
)
