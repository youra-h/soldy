import { toRaw } from 'vue'
import {
	createAdapterContext,
	type IAdapterContext,
	type IAdapterContextConfig,
	type IAdapterContextOptions,
	type IComponentDescriptor,
	type IPluginDefinition,
	type TPluginOutputsFrom,
} from '@soldy/setup'

/**
 * Опции и конфиг — те же, что у `createAdapterContext`: setup их экспортирует,
 * и копии здесь больше нет. Имена оставлены прежними — их ждут компоненты.
 */
export type IVueAdapterContextOptions<TInstance extends object> = IAdapterContextOptions<TInstance>
export type IVueAdapterContextConfig = IAdapterContextConfig

/** Снимает Vue-прокси со значений верхнего уровня объекта, не заглядывая внутрь. */
function stripTopLevelProxies<T extends object>(value: T): T {
	return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, toRaw(v)])) as T
}

/**
 * Обёртка над `createAdapterContext` из `@soldy/setup`, единственное место,
 * где Vue-компонентам нужен `toRaw`. Снимает прокси с `ctrl` и со значений
 * верхнего уровня `options` (в частности, `engine` коллекционного контекста)
 * перед тем, как отдать их ядру, которое `vue` не импортирует и о прокси не
 * знает. Имя `engine` обёртке знать не нужно: `toRaw` на значении без прокси
 * ничего не меняет.
 *
 * Цепочка `.use(...)` остаётся на месте вызова, как и раньше — набора
 * расширений по умолчанию обёртка не собирает (см. AGENTS.md, «Vue collection
 * setup»).
 *
 * Тип контекста — тот же, что у `createAdapterContext`: инстанс и выходы
 * плагинов выводятся из дескриптора.
 */
export function createVueAdapterContext<
	TInstance extends object,
	TPlugins extends readonly IPluginDefinition[] = readonly [],
>(
	descriptor: IComponentDescriptor<any, any, TPlugins, any, TInstance>,
	options: IVueAdapterContextOptions<TInstance>,
	config?: IVueAdapterContextConfig,
): IAdapterContext<TInstance, TPluginOutputsFrom<TPlugins>> {
	return createAdapterContext(
		descriptor,
		{
			...options,
			ctrl: options.ctrl !== undefined ? toRaw(options.ctrl) : undefined,
			options:
				options.options !== undefined ? stripTopLevelProxies(options.options) : undefined,
		},
		config,
	)
}
