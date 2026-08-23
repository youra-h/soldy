import { TUniqueExtension } from '@soldy/core'
import { UniqueExtensionContribution } from '../../../../contributions'
import { defineExtension } from '../../../base'

export const UniqueExtensionDescriptor = defineExtension({
	name: 'unique',
	namespace: 'unique',
	ctor: TUniqueExtension,
	contribution: UniqueExtensionContribution,
})
