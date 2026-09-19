/**
 * defineComponent — дескриптор компонента: унаследованные декларации.
 *
 * Дескриптор — описание типа и только оно: что компонент объявляет наружу и из
 * каких плагинов состоит. Собирает по нему компонент сборка (`assemble/`),
 * дескриптор о ней не знает.
 *
 * Типы дескриптора руками не пишутся — `defineComponent` выводит их из опций.
 * Пропсы и события — у класса ядра: его инстанс и есть схема для типов
 * (`TInstanceProps`, `TInstanceEvents`), без своего `ctor` — у родительского.
 * Слоты — из объявления `slots` поверх слотов `extends`, кортеж плагинов — из
 * `plugins`. Второй записи пропсов, событий или слотов рядом с объявлением нет.
 */

import type { IPropDeclaration, ISlotDeclaration, TName } from '@soldy/accessor'
import type { TInstanceEvents, TInstanceProps, TMergeSlots, TSlotsOf } from './inference.types'
import { inheritDeclarations } from './inherit'
import type {
	IComponentDefinitionOptions,
	IComponentDescriptor,
	IPluginDefinition,
	TDefinitionOptions,
	TSlotDefinitions,
} from './types'

/**
 * Параметры типа выводятся из опций, явно их не передают. Кортеж плагинов —
 * `const`: иначе `plugins` вывелся бы массивом, и неймспейсы плагинов пропали
 * бы из типов адаптеров.
 */
export function defineComponent<
	const TPlugins extends readonly IPluginDefinition[] = readonly [],
	TSlots extends TSlotDefinitions = Record<never, never>,
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentSlots extends object = object,
	TParentInstance extends object = object,
	TInstance extends object = TParentInstance,
>(
	options: IComponentDefinitionOptions<
		TPlugins,
		TSlots,
		TParentPlugins,
		TParentSlots,
		TParentInstance,
		TInstance
	>,
): IComponentDescriptor<
	TInstanceProps<TInstance>,
	TInstanceEvents<TInstance>,
	readonly [...TParentPlugins, ...TPlugins],
	TMergeSlots<TParentSlots, TSlotsOf<TSlots>>,
	TInstance
>

/**
 * Тело — под сигнатурой без типов: фантомные параметры рантайму не нужны, а
 * `ctor` без своего и без родителя — `Object`, и связать его с выведенным
 * инстансом можно только в типах.
 */
export function defineComponent(options: TDefinitionOptions): IComponentDescriptor {
	const { ctor, props, events, slots, plugins } = inheritDeclarations(options)

	return {
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
}
