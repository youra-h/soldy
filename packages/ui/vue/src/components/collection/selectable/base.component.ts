import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
// import { SelectableCollectionDescriptor } from '@soldy/setup'
import { default as BaseCollection } from '../base.component'

export const emitsSelectableCollection: TEmits = useEmits({ events: [], props: [] } as TEmits) as unknown as TEmits

export const propsSelectableCollection: TProps = useProps({ ctor: Object, props: [] }) as TProps

export default {
	name: 'BaseSelectableCollection',
	extends: BaseCollection,
	emits: emitsSelectableCollection,
	props: propsSelectableCollection,
}
