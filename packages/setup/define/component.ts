/**
 * defineComponent — дескриптор компонента: унаследованные декларации.
 *
 * Дескриптор — описание типа и только оно: что компонент объявляет наружу и из
 * каких плагинов состоит. Собирает по нему компонент сборка (`assemble/`),
 * дескриптор о ней не знает.
 *
 * Типы дескриптора руками не пишутся — `defineComponent` выводит их из опций.
 * Пропсы — у класса ядра: его инстанс и есть схема для типов
 * (`TInstanceProps`), без своего `ctor` — у родительского. События — карта того
 * же класса, суженная до имён, которые дескриптор публикует: `events` и
 * триггеры пропсов, свои и `extends` (`TPublishedEvents`). Слоты — из
 * объявления `slots` поверх слотов `extends`, кортеж плагинов — из `plugins`.
 * Второй записи пропсов, событий или слотов рядом с объявлением нет.
 */

import type { IPropDeclaration, ISlotDeclaration, TName } from '@soldy/accessor'
import type {
	TInstanceEventName,
	TInstanceProps,
	TMergeSlots,
	TPublishedEvents,
	TSlotsOf,
} from './inference.types'
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
 *
 * Имена событий (`TEventName`) — из `events` и триггеров своих пропсов, их
 * констрейнт — ключи карты событий инстанса (`TInstanceEventName`): опечатка в
 * триггере или событие, которого класс не шлёт, — ошибка компиляции
 * дескриптора. Имена родителя (`TParentEventName`) приходят из `extends`
 * готовыми: их сверил родитель, если у него был класс ядра. У родителя без
 * класса (`EntityDescriptor`, `CollectionDescriptor`) их сверить было не с чем,
 * и карту к ним прикладывает наследник.
 */
export function defineComponent<
	const TPlugins extends readonly IPluginDefinition[] = readonly [],
	TSlots extends TSlotDefinitions = Record<never, never>,
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentSlots extends object = object,
	TParentInstance extends object = object,
	TInstance extends object = TParentInstance,
	TParentEventName extends string = never,
	TEventName extends TInstanceEventName<TInstance> = never,
>(
	options: IComponentDefinitionOptions<
		TPlugins,
		TSlots,
		TParentPlugins,
		TParentSlots,
		TParentInstance,
		TInstance,
		TParentEventName,
		TEventName
	>,
): IComponentDescriptor<
	TInstanceProps<TInstance>,
	TPublishedEvents<TInstance, TParentEventName | TEventName>,
	readonly [...TParentPlugins, ...TPlugins],
	TMergeSlots<TParentSlots, TSlotsOf<TSlots>>,
	TInstance,
	TParentEventName | TEventName
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
