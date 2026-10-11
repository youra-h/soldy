/**
 * Attachment стиля корня на готовом узле — так, как его выполняет Svelte на
 * корне компонента: в эффекте, с реактивными слоями.
 *
 * Нужен там, где узел корня тест готовит сам: стиль сервера на узле перед
 * гидратацией (гидратацию пакет не проверит — в одном прогоне компоненты
 * собраны под одно окружение, см. `vitest.config.ts`) и слои, которых у
 * компонентов Svelte пока нет. Руны работают только в `.svelte` и
 * `.svelte.ts`, поэтому помощник живёт в своём файле, а не в спеке.
 */

import { flushSync } from 'svelte'
import type { TRootStyleLayers } from '@soldy-ui/svelte'
import { rootStyle } from '../src/adapter/runtime/root-style.svelte'

export type TAttachedStyle = {
	/** Слои стиля корня; присваивание — смена стиля, тест сбрасывает её `flushSync()`. */
	layers: TRootStyleLayers
	/** Снять attachment. */
	detach: () => void
}

/** Поставить стиль корня на узел; к возврату свойства уже на нём. */
export function attachRootStyle(node: Element, initial: TRootStyleLayers): TAttachedStyle {
	let layers = $state.raw(initial)

	const detach = $effect.root(() => {
		rootStyle(() => layers)(node)
	})

	flushSync()

	return {
		get layers() {
			return layers
		},
		set layers(next) {
			layers = next
		},
		detach,
	}
}
