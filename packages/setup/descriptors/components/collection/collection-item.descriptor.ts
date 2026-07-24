/**
 * Дескриптор CollectionItem (TCollectionItem).
 */

import { defineComponent } from '../../base'
import { TCollectionItem } from '@soldy/core'
import { CollectionItemContribution } from '../../../contributions/components/collection'
import { EntityDescriptor } from '../entity.descriptor'

export const CollectionItemDescriptor = defineComponent({
	ctor: TCollectionItem,

	extends: EntityDescriptor,

	contribution: CollectionItemContribution,
})
