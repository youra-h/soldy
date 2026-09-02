import { type IPluginBundle } from '@soldy/plugins'
import type { IComponent } from '@soldy/core'
import type { UnwrapNestedRefs } from 'vue'

export type TEmits = readonly string[]
export type TProps = Readonly<Record<string, any>>

export interface ISyncComponentOptions<TProps, TInstance = IComponent, TPlugins = IPluginBundle> {
	props: TProps
	instance: TInstance
	emit?: (...args: any[]) => void
	plugins: TPlugins
}

export type TBaseComponentProps<
	TCoreProps,
	TInstance extends IComponent = IComponent,
> = TCoreProps & {
	ctrl?: TInstance | UnwrapNestedRefs<TInstance>
	plugins?: IPluginBundle | undefined
}
