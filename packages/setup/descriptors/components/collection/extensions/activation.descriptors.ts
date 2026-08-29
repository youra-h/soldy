import { TActivationExtension } from '@soldy/core'
import {
	ActivationExtensionContribution,
	ActivationItemExtensionContribution,
} from './../../../../contributions'
import { defineExtension } from '../../../base'

export const ActivationExtensionDescriptor = () =>
	defineExtension({
		name: 'activation',
		// namespace: 'activation',
		ctor: TActivationExtension,
		contribution: ActivationExtensionContribution(),
		itemContribution: ActivationItemExtensionContribution(),
	})
