import { type IPluginBundle } from '@soldy/plugins'
import type { IEntity } from '@soldy/core'
import type { UnwrapNestedRefs } from 'vue'
import type { IComponentDescriptor, DescriptorProps } from '@soldy/setup'

export type TEmits = readonly string[]
export type TProps = Readonly<Record<string, any>>

export type TBaseComponentProps<TCoreProps, TInstance extends IEntity = IEntity> = TCoreProps & {
	ctrl?: TInstance | Partial<TInstance> | UnwrapNestedRefs<TInstance>
	plugins?: IPluginBundle | undefined
}

/** Props компонента, выведенные из дескриптора: UseProps<typeof ButtonDescriptor, IButton> → ButtonProps */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
> = TBaseComponentProps<DescriptorProps<TDescriptorFn>, TInstance>
