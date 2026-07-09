import type { IComponentView } from '@soldy/core'
import type { TBaseComponentProps } from '../component'

export type TBaseComponentViewProps<
	TCoreProps,
	TInstance extends IComponentView = IComponentView,
	> = TBaseComponentProps<TCoreProps, TInstance> & {}
