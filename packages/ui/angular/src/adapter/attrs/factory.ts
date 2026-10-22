/**
 * Фабрика рендереров адаптера: каждый рендерер `ɵDomRendererFactory2` обёрнут
 * `TForwardingRenderer`, одна обёртка на рендерер Angular.
 *
 * Подменяется закрытый `ɵDomRendererFactory2`, а не `RendererFactory2`: тот
 * подменяют и старые анимации, и действовала бы одна подмена из двух. Своего
 * конструктора нет — зависимости родителя у Angular 21 и 22 разные, — поэтому
 * зависимости берутся `inject` в полях. AGENTS.md (Angular), «Рендерер
 * адаптера — `provideAttrs()`».
 */

import {
	ANIMATION_MODULE_TYPE,
	Injectable,
	inject,
	type Renderer2,
	type RendererType2,
} from '@angular/core'
import { ɵDomRendererFactory2 } from '@angular/platform-browser'
import { TForwardRegistry } from './registry'
import { TForwardingRenderer } from './renderer'

/** Снять проверку `[@x]` с рендерера Angular — по полю, как фабрика анимаций Angular 21. */
function allowSyntheticProps(renderer: Renderer2): void {
	if ('throwOnSyntheticProps' in renderer) renderer.throwOnSyntheticProps = false
}

@Injectable()
export class TForwardingRendererFactory extends ɵDomRendererFactory2 {
	private readonly _registry = inject(TForwardRegistry).serve()

	/**
	 * Фабрика старых анимаций снимает проверку `[@x]` только с рендерера Angular,
	 * которого узнаёт по классу, — наш она не узнаёт, и проверку снимаем сами.
	 */
	private readonly _animated = inject(ANIMATION_MODULE_TYPE, { optional: true }) !== null

	private readonly _renderers = new WeakMap<Renderer2, TForwardingRenderer>()

	override createRenderer(element: unknown, type: RendererType2 | null): Renderer2 {
		const delegate = super.createRenderer(element, type)
		const known = this._renderers.get(delegate)

		if (known) return known

		if (this._animated) allowSyntheticProps(delegate)

		const renderer = new TForwardingRenderer(delegate, this._registry)

		this._renderers.set(delegate, renderer)

		return renderer
	}
}
