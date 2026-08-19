import { TActivationExtension } from '@soldy/core'
import { ActivationExtensionContribution } from './../../../../contributions'

export const ActivationExtensionDescriptor = () => defineExtension<TItem = object>({
	ctor: TActivationExtension<TItem>,

	contribution: ActivationExtensionContribution,
})
