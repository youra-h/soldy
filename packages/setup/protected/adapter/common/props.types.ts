/**
 * Пропсы компонента в типах адаптеров: контракт дескриптора плюс служебные пропсы адаптера.
 *
 * Одинаковы у всех фреймворков, поэтому объявлены здесь один раз; адаптер
 * добавляет только своё — слоты своим механизмом и атрибуты DOM.
 */

import type {
	DescriptorAllEvents,
	DescriptorAllProps,
	DescriptorInstance,
	IComponentDescriptor,
} from '../../define'
import type { TCallbackEventProps } from '../../naming'

/** Служебные пропсы, которые принимает сам адаптер, а не инстанс ядра. */
export type TAdapterProps<TInstance> = {
	/**
	 * Готовый инстанс ядра вместо собранного по пропсам. Только сам объект:
	 * реактивная обёртка фреймворка ему не нужна — ядро шлёт события само.
	 */
	ctrl?: TInstance
	/**
	 * Имя места, если компонент — деталь разметки другого компонента soldy
	 * (`tags.close`). Ставит разметка библиотеки, а не потребитель: по нему
	 * `usePlugins` со `scope: 'own'` пропускает вложенный компонент.
	 */
	embedded?: string
	/**
	 * Значения пропсов плагинов, поставленных снаружи (`usePlugins`,
	 * `bundle.use`), по имени пропа: `{ timer_ms: 500 }`. Типы ключей
	 * приложение дописывает в `IExternalPluginProps`.
	 */
	pluginProps?: TExternalPluginProps
}

/**
 * Пропсы внешних плагинов, которые знает приложение. Пустой намеренно: его
 * дополняют рядом с `definePlugin` плагина —
 *
 *   declare module '@soldy-ui/setup' {
 *     interface IExternalPluginProps { timer_ms?: number }
 *   }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IExternalPluginProps {}

/** `pluginProps`: известные ключи с их типами, остальные — как есть. */
export type TExternalPluginProps = IExternalPluginProps & Readonly<Record<string, unknown>>

/**
 * Пропсы компонента из дескриптора: свои, плагинов дескриптора и служебные
 * адаптера. `ctrl` — инстанс дескриптора; вторым параметром адаптер сужает его
 * до интерфейса ядра (`IButton`), если отдаёт наружу его, а не класс.
 */
export type DescriptorComponentProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance = DescriptorInstance<TDescriptorFn>,
> = DescriptorAllProps<TDescriptorFn> & TAdapterProps<TInstance>

/** События компонента колбэк-пропами — у React, Solid и Svelte: `onElementReady`. */
export type DescriptorCallbackEvents<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
> = TCallbackEventProps<DescriptorAllEvents<TDescriptorFn>>
