import { inputBinding, type DirectiveWithBindings, type Type } from '@angular/core'
import {
	RoleIconDirective,
	TButtonComponent,
	TIconComponent,
	TProgressSpinnerComponent,
	TSkeletonComponent,
} from '@soldy-ui/angular'

/**
 * Как рисовать компонент на стенде — в Angular.
 *
 * Та же карта, что у хоста Vue (`hosts/vue/previews.ts`), и с теми же ключами
 * — идентификаторами реестра. Разметки, в которую разложить пропсы строки, у
 * Angular нет: привязки шаблона перечисляются поимённо, а у строки проп свой.
 * Поэтому превью — не шаблон, а описание: компонент адаптера, пропсы превью и
 * чем дополнить его корень. Компонент строит хост (`createComponent`), а
 * пропсы — и превью, и строки поверх них, как атрибуты перед `{...bind}` у
 * React, — отдаёт входам по имени. Превью то же самое, что у Vue и React,
 * чтобы колонки фреймворков можно было сравнивать глазами.
 *
 * Корень компонента — сам элемент (`<button so-button>`), и тег его — тег
 * первого селектора: так Angular строит хост сам. Входа `tag` нет, как у
 * Web Components: тег — у элемента, и строка `tag` его не меняет.
 *
 * Чего у адаптера нет, того нет и в карте. Слоёв и `frame` здесь тоже нет: во
 * Vue это ComponentView с чужими пропами, а у компонента Angular чужого входа
 * нет вовсе.
 */
export type TPreview = {
	/** Компонент адаптера. */
	readonly component: Type<object>
	/** Пропсы превью — под пропсами строки. */
	readonly props?: Readonly<Record<string, unknown>>
	/**
	 * Свой элемент корня, когда тег первого селектора не годится: рисунок
	 * иконки по роли ложится только на `<svg>`.
	 */
	readonly element?: () => Element
	/** Директивы на корне — как атрибуты директив рядом с селектором в разметке. */
	readonly directives?: readonly DirectiveWithBindings<unknown>[]
}

/** Пространство имён SVG: в нём документ строит `<svg>` иконки. */
const SVG = 'http://www.w3.org/2000/svg'

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — пропом `text`, а не содержимым: заданный слот перекрывает проп,
	// и строка `text` на странице свойств не меняла бы ничего видимого
	button: { component: TButtonComponent, props: { text: 'Кнопка' } },

	// `<svg so-icon so-role-icon="arrowDown">`: глиф роли кладёт на `<svg>`
	// директива адаптера, а тег первого селектора Icon — `span`
	icon: {
		component: TIconComponent,
		element: () => document.createElementNS(SVG, 'svg'),
		directives: [
			{
				type: RoleIconDirective,
				bindings: [inputBinding('so-role-icon', () => 'arrowDown')],
			},
		],
	},

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`. Имени без видимой подписи у него нет, превью
	// даёт его пропом
	'progress-spinner': { component: TProgressSpinnerComponent, props: { aria_label: 'Загрузка' } },

	skeleton: { component: TSkeletonComponent, props: { width: 160, height: 16 } },
}
