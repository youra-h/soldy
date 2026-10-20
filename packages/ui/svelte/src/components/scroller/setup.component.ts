/**
 * setupScroller — setup-слой Scroller.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда. Так
 * же — приёмник корня (`receive`): запись в связываемый проп `ref`
 * компонента, `$bindable` компилятор тоже пускает только в компонент.
 */

import { ScrollerDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { ScrollerProps } from './base.component'

export function setupScroller(
	getProps: () => ScrollerProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const adapter = createSvelteAdapterContext(ScrollerDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	// Логики здесь нет: края ленты и её листание — `TScrollerViewportPlugin`,
	// выключенность кнопок и `tabindex` вьюпорта — ядро. Нажатия на кнопки
	// ловит плагин слушателем на корне, и обработчику в разметке взяться
	// неоткуда
	return useAdapter(adapter, getProps, receive)
}
