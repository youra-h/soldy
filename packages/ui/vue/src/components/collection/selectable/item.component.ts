import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { SelectableCollectionItemDescriptor } from '@soldy/setup'
import { BaseCollectionItem } from '../item'

export const emitsSelectableCollectionItem: TEmits = useEmits(
	SelectableCollectionItemDescriptor,
) as unknown as TEmits

export const propsSelectableCollectionItem: TProps = useProps(
	SelectableCollectionItemDescriptor,
) as TProps

export default {
	name: 'BaseSelectableCollectionItem',
	extends: BaseCollectionItem,
	emits: emitsSelectableCollectionItem,
	props: propsSelectableCollectionItem,
}
