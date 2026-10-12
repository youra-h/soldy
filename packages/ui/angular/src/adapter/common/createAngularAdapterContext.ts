import { createAdapterContext } from '@soldy-ui/setup'
import { nearestLocale } from '../locale/context'
import { nextMountId } from './mount-id'

/**
 * Обёртка над `createAdapterContext` из `@soldy-ui/setup` — сборка компонента
 * Angular, как `createVueAdapterContext` у Vue, `create` у React,
 * `createSvelteAdapterContext` у Svelte и `createSolidAdapterContext` у Solid.
 *
 * Id монтирования (`mountId`) — номер сборки компонента в его приложении
 * (`nextMountId`, префикс — `APP_ID`): от него плагины строят `id` частей. Id
 * места в дереве Angular не даёт, но полная гидратация собирает компоненты в
 * том же порядке, что и сервер, и номера у сервера и браузера сходятся, а
 * счётчик процесса на сервере общий для всех запросов и разошёлся бы. Id
 * монтирования, заданный опцией явно, остаётся за тем, кто его задал.
 *
 * Там же — локаль поддерева (`locale`): источник ближайшего
 * `LocaleProviderDirective` выше по дереву, из DI. Провайдера нет — опция не
 * задана, и у набора своя английская. Локаль, заданная опцией явно, тоже
 * остаётся за тем, кто её задал.
 *
 * Зовётся в контексте инъекции компонента: `inject` DI Angular разрешает только
 * там, и база (`TComponentBase`) собирает компонент внутри
 * `runInInjectionContext` своего инжектора.
 *
 * Сигнатура — сама `createAdapterContext`: контракт контекста выводится из
 * дескриптора там же, где и у остальных адаптеров.
 */
export const createAngularAdapterContext: typeof createAdapterContext = (
	descriptor,
	options,
	config,
) =>
	createAdapterContext(
		descriptor,
		{
			...options,
			mountId: options.mountId ?? nextMountId(),
			locale: options.locale ?? nearestLocale(),
		},
		config,
	)
