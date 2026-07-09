import type { UnwrapNestedRefs } from 'vue'
import type { IComponent } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins'

export type TBaseComponentProps<
	TCoreProps,
	TInstance extends IComponent = IComponent,
> = TCoreProps & {
	ctrl?: TInstance | UnwrapNestedRefs<TInstance>
		plugins?: IPluginBundle | undefined
}
