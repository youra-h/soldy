import { createAdapterContext } from '@soldy-ui/setup'
import type {
	IAdapterContext,
	IAdapterContextConfig,
	IAdapterContextOptions,
	IComponentDescriptor,
	IPluginsContract,
	TContextContract,
} from '@soldy-ui/setup'
import { nearestLocale } from '../locale/context'

/**
 * Обёртка над `createAdapterContext` из `@soldy-ui/setup` — сборка элемента
 * Web Components, как `createVueAdapterContext` у Vue, `create` у React,
 * `createSvelteAdapterContext` у Svelte, `createSolidAdapterContext` у Solid и
 * `createAngularAdapterContext` у Angular.
 *
 * Добавляет локаль поддерева (`locale`): источник ближайшего
 * `<so-locale-provider>` вверх от хоста — контекст места. Провайдера нет —
 * опция не задана, и у набора своя английская. Локаль, заданная опцией явно,
 * остаётся за тем, кто её задал.
 *
 * Хост — сам элемент: контекста у платформы нет, и место в документе — всё,
 * что знает о поддереве компонент. Поэтому он первый параметр, а не опция
 * сборки. Зовётся при подключении элемента: связка у него новая на каждое
 * подключение, и элемент, переставленный под другой провайдер, собирается уже
 * с его локалью.
 *
 * Id монтирования обёртка не передаёт: Custom Element живёт только в браузере,
 * серверной разметки, с которой `id` пришлось бы сойтись, у него нет, и набору
 * хватает своего счётчика.
 */
export function createWebcAdapterContext<
	TInstance extends object,
	TPlugins extends IPluginsContract,
>(
	host: Element,
	descriptor: IComponentDescriptor<TContextContract<TInstance, TPlugins>>,
	options: IAdapterContextOptions<TInstance>,
	config?: IAdapterContextConfig,
): IAdapterContext<TContextContract<TInstance, TPlugins>> {
	return createAdapterContext(
		descriptor,
		{ ...options, locale: options.locale ?? nearestLocale(host) },
		config,
	)
}
