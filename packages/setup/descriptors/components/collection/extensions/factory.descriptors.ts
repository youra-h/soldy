import { TFactoryExtension } from '@soldy/core'
import { FactoryExtensionContribution } from '../../../../contributions'
import { defineExtension } from '../../../base'

// optionsFactory (e.g. { itemCtor }) задаётся в конкретном дескрипторе коллекции
export const FactoryExtensionDescriptor = () =>
	defineExtension({
		name: 'factory',
		ctor: TFactoryExtension,
		contribution: FactoryExtensionContribution(),
	})
