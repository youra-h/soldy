import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { TabsDescriptor } from '@soldy/setup'

export const emitsTabs: TEmits = useEmits(TabsDescriptor) as unknown as TEmits

export const propsTabs: TProps = useProps(TabsDescriptor) as TProps

export default {
	name: 'BaseTabs',
	extends: BaseControl,
	emits: emitsTabs,
	props: propsTabs,
}
