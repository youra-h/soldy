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
 * Опции сборки — те же, что у `createAdapterContext`, но id монтирования
 * обязателен: его даёт только компонент (`$props.id()`), и забытый ловят типы,
 * а не расхождение `id` при гидратации.
 */
export type TSvelteAdapterContextOptions<TInstance extends object> =
	IAdapterContextOptions<TInstance> & { mountId: string }

/**
 * Обёртка над `createAdapterContext` из `@soldy-ui/setup` — сборка компонента
 * Svelte, как `createVueAdapterContext` у Vue и `create` у React.
 *
 * Id монтирования (`mountId`) — от `$props.id()` компонента: от него плагины
 * строят `id` частей. Счётчик процесса на сервере общий для всех запросов, и
 * `id` от него расходились бы при гидратации, а `$props.id()` — единственный
 * id Svelte, который совпадает на сервере и при гидратации. Компилятор пускает
 * его только в `<script>` компонента, поэтому сюда его отдаёт сам компонент,
 * как `$props()`, — обёртка своего взять не может.
 *
 * Там же — локаль поддерева (`locale`): источник ближайшего `LocaleProvider`
 * выше по дереву. Провайдера нет — опция не задана, и у набора своя
 * английская. Локаль, заданная опцией явно, остаётся за тем, кто её задал.
 *
 * Зовётся при инициализации компонента: контекст Svelte читается только
 * тогда.
 */
export function createSvelteAdapterContext<
	TInstance extends object,
	TPlugins extends IPluginsContract,
>(
	descriptor: IComponentDescriptor<TContextContract<TInstance, TPlugins>>,
	options: TSvelteAdapterContextOptions<TInstance>,
	config?: IAdapterContextConfig,
): IAdapterContext<TContextContract<TInstance, TPlugins>> {
	return createAdapterContext(
		descriptor,
		{ ...options, locale: options.locale ?? nearestLocale() },
		config,
	)
}
