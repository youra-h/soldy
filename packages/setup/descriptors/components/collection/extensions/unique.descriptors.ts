import { TUniqueExtension } from '@soldy/core'
import { UniqueExtensionContribution } from '../../../../contributions'
import { defineExtension } from '../../../base'

export const UniqueExtensionDescriptor = () =>
	defineExtension({
		name: 'unique',
		ctor: TUniqueExtension,
		contribution: UniqueExtensionContribution(),
	})
