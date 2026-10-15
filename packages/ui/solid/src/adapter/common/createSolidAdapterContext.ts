import { createUniqueId } from 'solid-js'
import { createAdapterContext } from '@soldy-ui/setup'
import { nearestLocale } from '../locale/context'

/**
 * Обёртка над `createAdapterContext` из `@soldy-ui/setup` — сборка компонента
 * Solid, как `createVueAdapterContext` у Vue, `create` у React и
 * `createSvelteAdapterContext` у Svelte.
 *
 * Id монтирования (`mountId`) — от `createUniqueId()`: от него плагины строят
 * `id` частей. Счётчик процесса на сервере общий для всех запросов, и `id` от
 * него расходились бы при гидратации, а `createUniqueId()` Solid выводит из
 * места компонента в дереве — он совпадает на сервере и при гидратации. Звать
 * его можно из любой функции тела компонента, поэтому берёт его обёртка, а не
 * компонент. Id монтирования, заданный опцией явно, остаётся за тем, кто его
 * задал.
 *
 * Там же — локаль поддерева (`locale`): источник ближайшего `LocaleProvider`
 * выше по дереву. Провайдера нет — опция не задана, и у набора своя
 * английская. Локаль, заданная опцией явно, тоже остаётся за тем, кто её
 * задал.
 *
 * Id монтирования и локаль уходят своему набору плагинов. Контекст на чужом
 * наборе (`config.bundle`) — фасад коллекции на наборе компонента — их не
 * берёт: id монтирования и локаль у того, кто набор собрал, как у
 * `createAngularAdapterContext`. Id на фасад не тратится, и у компонента с
 * двумя контекстами он один.
 *
 * Зовётся при выполнении тела компонента: оно выполняется один раз, и
 * контекст Solid читается только тогда. Сигнатура — сама
 * `createAdapterContext`: контракт контекста выводится из дескриптора там же,
 * где и у остальных адаптеров.
 */
export const createSolidAdapterContext: typeof createAdapterContext = (
	descriptor,
	options,
	config,
) => {
	// Набор не свой — id монтирования и локаль у того, кто его собрал
	if (config?.bundle !== undefined) return createAdapterContext(descriptor, options, config)

	return createAdapterContext(
		descriptor,
		{
			...options,
			mountId: options.mountId ?? createUniqueId(),
			locale: options.locale ?? nearestLocale(),
		},
		config,
	)
}
