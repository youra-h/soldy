/**
 * Дескриптор Collection (TCollection).
 *
 * Наследует EntityDescriptor (ctrl, plugins).
 * TCollection не TComponent — нет rendered/visible/tag/classes.
 */

import { defineComponent } from '../../base'
import { TCollection } from '@soldy/core'
import { CollectionContribution } from '../../../contributions/components/collection'
import { EntityDescriptor } from '../entity.descriptor'

export const CollectionDescriptor = defineComponent({
	ctor: TCollection,

	extends: EntityDescriptor,

	contribution: CollectionContribution,
})
