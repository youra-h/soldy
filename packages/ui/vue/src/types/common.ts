import type { IEntity } from '@soldy/core'
import type { IComponentDescriptor, DescriptorAllProps, TRegisteredPluginProps } from '@soldy/setup'

export type TEmits = readonly string[]
export type TProps = Readonly<Record<string, unknown>>

export type TBaseComponentProps<TCoreProps, TInstance extends IEntity = IEntity> = TCoreProps & {
	/**
	 * Готовый core-инстанс. Только сам инстанс: реактивная обёртка Vue
	 * (`reactive`, `ref`) ему не нужна — ядро шлёт события само, а setup всё
	 * равно снимает прокси через `toRaw`.
	 */
	ctrl?: TInstance
	/**
	 * Имя места, если компонент — деталь разметки другого компонента soldy
	 * (`tags.close`). Ставит разметка библиотеки, а не потребитель: по нему
	 * `usePlugins` со `scope: 'own'` пропускает вложенный компонент.
	 */
	embedded?: string
}

/** Props компонента, выведенные из дескриптора: UseProps<typeof ButtonDescriptor, IButton> → ButtonProps */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
> = TBaseComponentProps<
	// Пропсы плагинов реестра (`usePlugins`) — по типу инстанса, из `IRegisteredPlugins`
	DescriptorAllProps<TDescriptorFn> & TRegisteredPluginProps<TInstance>,
	TInstance
>
