/**
 * `<so-locale-provider>` — локаль поддерева, как контекст у фреймворков.
 * Источник свой у каждого провайдера и сразу уходит контекстом места; локаль
 * — свойство из кода, плагины переписывают тег и имена на лету, без
 * пересборки. Автономный элемент без коробки (`displayContents`).
 *
 * ```html
 * <so-locale-provider>
 * 	<button is="so-button" text="Сохранить"></button>
 * </so-locale-provider>
 * <script type="module">
 * 	import { ruRU } from '@soldy-ui/plugins'
 *
 * 	document.querySelector('so-locale-provider').locale = ruRU
 * </script>
 * ```
 */

import { TLocaleSource, enUS } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { defineAutonomousElement } from '../runtime/defineElement'
import { displayContents } from '../runtime/display-contents'
import { provideLocale } from './context'

/** Записанное до апгрейда было обычным свойством, и тип ему никто не проверял. */
function isLocale(value: unknown): value is TLocale {
	return (
		typeof value === 'object' &&
		value !== null &&
		'tag' in value &&
		typeof value.tag === 'string' &&
		'translations' in value &&
		typeof value.translations === 'object' &&
		value.translations !== null
	)
}

export class TLocaleProviderElement extends HTMLElement {
	private readonly _source = new TLocaleSource(enUS)

	constructor() {
		super()
		provideLocale(this, this._source)
		this._upgradeLocale()
		displayContents(this)
	}

	get locale(): TLocale {
		return this._source.locale
	}

	set locale(value: TLocale) {
		this._source.locale = value
	}

	/** Записанное до апгрейда — собственное свойство: оно заслоняет свойство класса. */
	private _upgradeLocale(): void {
		if (!Object.hasOwn(this, 'locale')) return

		const value: unknown = Reflect.get(this, 'locale')

		Reflect.deleteProperty(this, 'locale')

		if (isLocale(value)) this.locale = value
	}
}

defineAutonomousElement('so-locale-provider', TLocaleProviderElement)
