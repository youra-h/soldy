import { TPlainExtension } from '@soldy/core'
import { PlainExtensionContribution } from '../../../../contributions'

export const PlainExtensionDescriptor = () => defineExtension<TItem = object>({
	ctor: TPlainExtension<TItem>,

	contribution: PlainExtensionContribution,
})
