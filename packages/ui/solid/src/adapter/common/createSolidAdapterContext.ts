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
 * Зовётся при выполнении тела компонента: оно выполняется один раз, и
 * контекст Solid читается только тогда. Сигнатура — сама
 * `createAdapterContext`: контракт контекста выводится из дескриптора там же,
 * где и у остальных адаптеров.
 */
export const createSolidAdapterContext: typeof createAdapterContext = (
	descriptor,
	options,
	config,
) =>
	createAdapterContext(
		descriptor,
		{
			...options,
			mountId: options.mountId ?? createUniqueId(),
			locale: options.locale ?? nearestLocale(),
		},
		config,
	)
