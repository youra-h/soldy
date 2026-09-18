/**
 * Пропсы компонента в типах адаптеров: контракт дескриптора плюс служебные пропсы адаптера.
 *
 * Одинаковы у всех фреймворков, поэтому объявлены здесь один раз; адаптер
 * добавляет только своё — слоты своим механизмом и атрибуты DOM.
 */

import type { DescriptorAllEvents, DescriptorAllProps, IComponentDescriptor } from '../../define'
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
}

/** Пропсы компонента из дескриптора: свои, плагинов дескриптора и служебные адаптера. */
export type DescriptorComponentProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance,
> = DescriptorAllProps<TDescriptorFn> & TAdapterProps<TInstance>

/** События компонента колбэк-пропами — у React, Solid и Svelte: `onElementReady`. */
export type DescriptorCallbackEvents<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
> = TCallbackEventProps<DescriptorAllEvents<TDescriptorFn>>
