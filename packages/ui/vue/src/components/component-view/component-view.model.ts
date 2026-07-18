/**
 * Скомпилированная модель TComponentView.
 * Используется и для emits/props, и для Runtime.
 */

import {
	compileComponent,
	ComponentContribution,
	ElementContribution,
	InstanceContribution,
} from '@soldy/provider'

export const componentViewModel = compileComponent(
	[ComponentContribution, ElementContribution, InstanceContribution],
	[
		{
			name: 'tag',
			kind: 'state',
			mutable: true,
			ownerId: ComponentContribution.id,
		},
		{
			name: 'classes',
			kind: 'computed',
			mutable: false,
			ownerId: ComponentContribution.id,
		},
	],
	['ready'],
)
