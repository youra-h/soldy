/**
 * Дескриптор Collection (TCollection).
 *
 * Наследует EntityDescriptor (ctrl, plugins).
 * TCollection не TComponent — нет rendered/visible/tag/classes.
 */

import { defineComponent, definePlugin } from '../../base'
import { TCollection } from '@soldy/core'
import { CollectionContribution } from '../../../contributions/components/collection'
import { EntityDescriptor } from '../entity.descriptor'
import {
	TCollectionItemPlugins,
	TElementAccumulationPlugin,
	TInstanceAccumulationPlugin,
} from '@soldy/plugins'

export const CollectionDescriptor = defineComponent({
	ctor: TCollection,

	extends: EntityDescriptor,

	contribution: CollectionContribution,

	plugins: [
		definePlugin({
			ctor: TCollectionItemPlugins,
		}),
		definePlugin({
			ctor: TElementAccumulationPlugin,
		}),
		definePlugin({
			ctor: TInstanceAccumulationPlugin,
		}),
	],
})
