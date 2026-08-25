import { TMetaExtension } from '@soldy/core'
import { MetaExtensionContribution } from '../../../../contributions'
import { defineExtension } from '../../../base'

/**
 * Дескриптор meta-расширения коллекции.
 * Устанавливается до activation/selection, чтобы те могли найти его через ctx.extensions.
 */
export const MetaExtensionDescriptor = defineExtension({
	name: 'meta',
	ctor: TMetaExtension,
	contribution: MetaExtensionContribution,
})
