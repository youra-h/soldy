import { type IPluginBundle } from '@soldy/plugins'
import type { IEntity } from '@soldy/core'
import type { UnwrapNestedRefs } from 'vue'

export type TEmits = readonly string[]
export type TProps = Readonly<Record<string, any>>

export type TBaseComponentProps<TCoreProps, TInstance extends IEntity = IEntity> = TCoreProps & {
	ctrl?: TInstance | Partial<TInstance> | UnwrapNestedRefs<TInstance>
	plugins?: IPluginBundle | undefined
}
