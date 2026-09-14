import { type IPluginBundle } from '@soldy/plugins'
import type { IEntity } from '@soldy/core'
import type { IComponentDescriptor, DescriptorAllProps } from '@soldy/setup'

export type TEmits = readonly string[]
export type TProps = Readonly<Record<string, any>>

export type TBaseComponentProps<TCoreProps, TInstance extends IEntity = IEntity> = TCoreProps & {
	/**
	 * Готовый core-инстанс. Только сам инстанс: реактивная обёртка Vue
	 * (`reactive`, `ref`) ему не нужна — ядро шлёт события само, а setup всё
	 * равно снимает прокси через `toRaw`.
	 */
	ctrl?: TInstance
	plugins?: IPluginBundle | undefined
}

/** Props компонента, выведенные из дескриптора: UseProps<typeof ButtonDescriptor, IButton> → ButtonProps */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
> = TBaseComponentProps<DescriptorAllProps<TDescriptorFn>, TInstance>
