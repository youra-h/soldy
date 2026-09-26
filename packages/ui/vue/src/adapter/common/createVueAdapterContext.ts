import { toRaw, useId } from 'vue'
import {
	createAdapterContext,
	type IAdapterContextConfig,
	type IAdapterContextOptions,
} from '@soldy-ui/setup'

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
 * Обёртка над `createAdapterContext` из `@soldy-ui/setup`, единственное место,
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
 * Здесь же — основа `id` экземпляра (`idBase`) от `useId`. Счётчик ядра
 * (`uid`) на сервере общий для всех запросов, и `id` от него расходились при
 * гидратации, а `useId` Vue выводит из места компонента в дереве. Обёртку
 * зовёт `setup()` компонента, поэтому у `useId` есть текущий компонент.
 * Основа, заданная опцией явно, остаётся за тем, кто её задал.
 *
 * Сигнатура — сама `createAdapterContext`: своих параметров типа у обёртки
 * нет, контракт контекста выводится из дескриптора там же, где и у остальных
 * адаптеров.
 */
export const createVueAdapterContext: typeof createAdapterContext = (descriptor, options, config) =>
	createAdapterContext(
		descriptor,
		{
			...options,
			ctrl: options.ctrl !== undefined ? toRaw(options.ctrl) : undefined,
			options: {
				idBase: useId(),
				...(options.options !== undefined ? stripTopLevelProxies(options.options) : {}),
			},
		},
		config,
	)
