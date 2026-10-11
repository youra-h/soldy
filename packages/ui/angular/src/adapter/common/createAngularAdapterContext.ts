import { createAdapterContext } from '@soldy-ui/setup'
import { nearestLocale } from '../locale/context'

/**
 * Обёртка над `createAdapterContext` из `@soldy-ui/setup` — сборка компонента
 * Angular, как `createVueAdapterContext` у Vue, `create` у React,
 * `createSvelteAdapterContext` у Svelte и `createSolidAdapterContext` у Solid.
 *
 * Добавляет локаль поддерева (`locale`): источник ближайшего
 * `LocaleProviderDirective` выше по дереву, из DI. Провайдера нет — опция не
 * задана, и у набора своя английская. Локаль, заданная опцией явно, остаётся
 * за тем, кто её задал.
 *
 * Зовётся в контексте инъекции компонента: `inject` DI Angular разрешает только
 * там, и база (`TComponentBase`) собирает компонент внутри
 * `runInInjectionContext` своего инжектора. Id монтирования обёртка не
 * передаёт: у Angular нет id места в дереве, который совпадал бы на сервере и
 * в браузере, и набор берёт свой счётчик.
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
		{ ...options, locale: options.locale ?? nearestLocale() },
		config,
	)
