/**
 * `<so-locale-provider>` — локаль поддерева: язык и строки библиотеки
 * компонентам внутри.
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
 *
 * Источник локали (`TLocaleSource`) у провайдера свой: он создаётся с
 * элементом и сразу уходит контекстом места его поддереву, а сборка каждого
 * компонента (`createWebcAdapterContext`) берёт ближайший вверх от себя и
 * отдаёт его набору плагинов. Источник один на провайдер, а не на процесс:
 * вложенный провайдер даёт поддереву свой. Без провайдера компоненты — на
 * английском.
 *
 * Локаль — свойство, и только из кода: это объект, строкой атрибута её не
 * передать. Пишется оно в тот же источник — плагины языка и имён переписывают
 * компонентам тег и имена на лету, а компоненты не пересобираются.
 * Английская, с которой источник создан, — только место под локаль до первой
 * записи. Записанное, пока элемент ещё не определён (`locale` у элемента
 * разметки до загрузки модуля), остаётся собственным свойством элемента и
 * заслоняет свойство класса — его провайдер подхватывает при апгрейде.
 *
 * Провайдер — автономный элемент, а не встроенный: нативного поведения,
 * которое стоило бы сохранить, у него нет, это не компонент. Своей коробки у
 * него тоже нет (`displayContents`): теневой корень несёт только `<slot>` и
 * `:host { display: contents }`, поэтому содержимое остаётся светом — его
 * раскладывает родитель провайдера, а стили документа до него доходят. Правило
 * `:host` слабее стилей документа, и `display` потребителя главнее.
 *
 * Регистрируется в модуле адаптера, раньше компонентов: модули компонентов
 * импортируют адаптер, и провайдер из разметки оживает раньше детей — они
 * собираются уже под ним.
 *
 * Провайдер — механизм платформы для локали, как контекст у фреймворков,
 * поэтому он в адаптерном слое, а не среди компонентов.
 */

import { TLocaleSource, enUS } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { defineAutonomousElement } from '../runtime/defineElement'
import { displayContents } from '../runtime/display-contents'
import { provideLocale } from './context'

/**
 * Локаль ли значение — проверка формы, а не приведение: свойство,
 * записанное до апгрейда, было обычным свойством элемента, и тип ему никто не
 * проверял.
 */
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

		// Своя коробка провайдеру не нужна: место в раскладке у его детей
		displayContents(this)
	}

	/** Локаль поддерева: тег для Intl и строки библиотеки (`ruRU`, `extendLocale(...)`). */
	get locale(): TLocale {
		return this._source.locale
	}

	set locale(value: TLocale) {
		this._source.locale = value
	}

	/**
	 * Локаль, записанная до апгрейда, — собственное свойство элемента: оно
	 * заслоняет свойство класса. Снимается и уходит в источник, как запись
	 * после апгрейда, — дети, которые соберутся следом, увидят уже её.
	 */
	private _upgradeLocale(): void {
		if (!Object.hasOwn(this, 'locale')) return

		const value: unknown = Reflect.get(this, 'locale')

		Reflect.deleteProperty(this, 'locale')

		if (isLocale(value)) this.locale = value
	}
}

defineAutonomousElement('so-locale-provider', TLocaleProviderElement)
