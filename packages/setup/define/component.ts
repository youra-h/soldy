/**
 * defineComponent — дескриптор компонента: унаследованные декларации.
 *
 * Дескриптор — описание типа и только оно: что компонент объявляет наружу и из
 * каких плагинов состоит. Собирает по нему компонент сборка (`assemble/`),
 * дескриптор о ней не знает.
 */

import type { IPropDeclaration, ISlotDeclaration, TName } from '@soldy/accessor'
import type { TResolveInstance } from './inference.types'
import { inheritDeclarations } from './inherit'
import type {
	IComponentDefinitionOptions,
	IComponentDescriptor,
	IPluginDefinition,
	TDefinitionOptions,
} from './types'

function buildDescriptor(options: TDefinitionOptions): IComponentDescriptor {
	const { ctor, props, events, slots, plugins } = inheritDeclarations(options)

	const descriptor: IComponentDescriptor = {
		ctor,

		props,
		events,
		slots,
		plugins,

		getProps(): IPropDeclaration[] {
			return [...props, ...plugins.flatMap((p) => p.props ?? [])]
		},

		getEvents(): TName[] {
			return [...events, ...plugins.flatMap((p) => p.events ?? [])]
		},

		getSlots(): ISlotDeclaration[] {
			return [...slots]
		},
	}

	return descriptor
}

/**
 * Одноразовая форма (без явных type-аргументов): кортеж плагинов выводится из
 * options.plugins. Используется дескрипторами без явного типа props/events.
 */
export function defineComponent<
	const TPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
	TInstance extends object = never,
	TParentInstance extends object = object,
>(
	options: IComponentDefinitionOptions<TPlugins, TParentPlugins, TInstance, TParentInstance>,
): IComponentDescriptor<
	Record<string, unknown>,
	object,
	readonly [...TParentPlugins, ...TPlugins],
	object,
	TResolveInstance<TInstance, TParentInstance>
>

/**
 * Curried-форма: явные TProps/TEvents/TSlots на первом вызове, кортеж плагинов
 * и тип инстанса выводятся на втором. Используется типизированными дескрипторами.
 *
 * TSlots с дефолтом `{}` — дескрипторы без слотов не переписываются.
 */
export function defineComponent<
	TProps extends object,
	TEvents extends object,
	TSlots extends object = object,
>(): <
	const TPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
	TInstance extends object = never,
	TParentInstance extends object = object,
>(
	options: IComponentDefinitionOptions<TPlugins, TParentPlugins, TInstance, TParentInstance>,
) => IComponentDescriptor<
	TProps,
	TEvents,
	readonly [...TParentPlugins, ...TPlugins],
	TSlots,
	TResolveInstance<TInstance, TParentInstance>
>

export function defineComponent(
	options?: TDefinitionOptions,
): IComponentDescriptor | ((options: TDefinitionOptions) => IComponentDescriptor) {
	if (options) return buildDescriptor(options)

	return (curried: TDefinitionOptions) => buildDescriptor(curried)
}
