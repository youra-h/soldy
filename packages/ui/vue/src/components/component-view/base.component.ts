import { TComponentView } from '@soldy/core'
import type { TEmits, TProps } from '../../types'
import { BaseComponent } from '../component'
import { useEmits, useProps } from '../../adapter'
import { componentViewModel } from '@soldy/setup'

export const emitsComponentView: TEmits = useEmits(componentViewModel) as unknown as TEmits

export const propsComponentView: TProps = useProps(componentViewModel, TComponentView) as TProps

export default {
	name: 'BaseComponentView',
	extends: BaseComponent,
	emits: emitsComponentView,
	props: propsComponentView,
}
