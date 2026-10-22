import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ISelect } from '@soldy-ui/core'
import {
	AttributesDirective,
	RoleIconDirective,
	SlotDirective,
	provideElevator,
} from '../../adapter'
import { TFrameComponent } from '../frame'
import { TIconComponent } from '../icon'
import { TInputComponent } from '../input'
import { TTagsComponent } from '../tags'
import { TSelectItemComponent } from './item'
import { TSelectGroupComponent } from './group'
import { TSelectSurface } from '../../generated/select.metadata'
import { setupSelect } from './setup.component'

/**
 * TSelectComponent — поле выбора из списка (Combobox, select-only или
 * `editable`): в корне поле и панель со списком, как у Vue.
 *
 * Селектор атрибутный, как у Button: `<div so-select>`. Корень — сам элемент
 * потребителя, рамка: на нём классы, `attrs` и `dataset` (`data-open` —
 * стрелку тема разворачивает по нему), их раскладывает `TComponentBase`
 * (стратегия `'host'`). Набор `aria` Select — имя, описание, ошибка, связка с
 * полем формы — у поля: фокус всегда на `<input>`, а не в списке.
 *
 * Поле — готовый Input (`<div so-input>`, помечен `#control`; шаблон слота
 * `field` его заменяет): текст, плейсхолдер и ARIA комбобокса принадлежат
 * экземпляру `TInput`, которым владеет Select (`field`), и разметка отдаёт его
 * целиком (`[ctrl]`) — рядом ни текста, ни плейсхолдера. Свой набор `aria`
 * Select кладёт на поле директивой набора, а всё, что потребитель написал на
 * Select, кроме класса и стиля, уходит туда же (`control`): статику переносит
 * база, привязки и слушатели — рендерер адаптера (`provideAttrs()`). Поле —
 * само хост, который отдаёт написанное своему `<input>`, и цепочка хостов
 * доводит до `<input>` и то и другое: набор Select — поверх набора
 * комбобокса, атрибуты потребителя — поверх обоих, как `v-bind` на `<Input>` у
 * Vue. `aria-label` и `id` потребителя называют комбобокс, а не корень без
 * роли. Поле формы `Field` над Select связывается с Select, а не с его полем:
 * поле — деталь разметки (`embedded`).
 *
 * Края поля Select отдаёт ему шаблонами всегда, как Vue свои `leading` и
 * `trailing`: обёртки поля стоят и без тегов. Слева — ряд тегов, пока выбор
 * множественный (`tags`): второй компонент со своей коллекцией, связку «опция ⇄
 * тег» держит `TSelectTagsExtension`; шаблон слота `tags` получает инстанс
 * тегов и его коллекцию — то, что встроенный ряд берёт `[ctrl]` и `[engine]`, —
 * и заменяет его, а не рисует теги второй раз. За ними — `[slot=leading]`.
 * Справа — стрелка: класс на обёртке, а не на иконке, — по нему тема
 * разворачивает стрелку, а `TSelectPointerPlugin` в `editable` открывает
 * панель только кликом по ней. За ней — `[slot=trailing]`. У краёв Select
 * scope нет — они проекция. Кнопку очистки рисует поле; свою кнопку слота
 * `clear` Select отдаёт полю, только когда она задана.
 *
 * Панель — Frame в шаблоне: телепорт, слой, привязка к корню, пометка
 * владельцем (`dismiss_ownerAttribute`): панель лежит вне поддерева Select, и
 * нажатие в неё иначе считалось бы нажатием мимо. Якорь — корень, его узел
 * шаблону отдаёт база (`rootElement()`): на сервере и до первой отрисовки его
 * нет, как и самого слоя. Открытость — `visible` панели, а не `rendered`:
 * опции входят в коллекцию при сборке, и закрытие не должно её вычищать.
 * `visible` Select панели не передаётся, как у Vue. Сторону и flip ядро
 * выводит из `placement`, ширину по полю — из `contentFit`.
 *
 * Контекстов два — свой и фасада коллекции (`setupSelect`), и входы фасада
 * (`items`, `mode`, `engine`, `trackBy`, `groupBy`, `groups`,
 * `tags_overflow`) — входы того же элемента. Свой слой лифта Select отдаёт
 * поддереву провайдером (`provideElevator()`): опции разметки — его
 * содержимое — и опции из данных в его шаблоне прочтут из слоя движок и
 * регистратор этого Select, а поле и теги — пустую связку поля формы.
 *
 * Логики здесь нет: открытие, клавиатура, ввод, жест и закрытие ведут плагины
 * (см. `setupSelect`).
 *
 * `div[so-select]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-select], [so-select]
 */
@Component({
	selector: 'div[so-select], [so-select]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		SlotDirective,
		TFrameComponent,
		TIconComponent,
		TInputComponent,
		TTagsComponent,
		TSelectItemComponent,
		TSelectGroupComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './select.component.html',
})
export class TSelectComponent extends TSelectSurface<ISelect> {
	constructor() {
		super((ctrl, inputs) => setupSelect(ctrl, inputs, this.engine), {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}
}
