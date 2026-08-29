import { TPlainExtension } from '@soldy/core'
import { PlainExtensionContribution } from '../../../../contributions'
import { defineExtension } from '../../../base'

export const PlainExtensionDescriptor = () =>
	defineExtension({
		name: 'plain',
		ctor: TPlainExtension,
		contribution: PlainExtensionContribution(),
	})
