import { Directive, ElementRef, Input, inject } from '@angular/core'
import type { TAttributesMap } from '@soldy-ui/core'
import { TForwardRegistry } from '../attrs/registry'
import { TElementAttributes, attributesOf } from './root-attributes'

/**
 * AttributesDirective — набор ядра на элементе шаблона, а не на корне: аналог
 * `v-bind="aria"` у Vue и спреда набора у JSX-адаптеров.
 *
 * ```html
 * <input type="checkbox" [so-attributes]="state()['aria']" />
 * <button so-button [so-attributes]="state()['clearAria']"></button>
 * ```
 *
 * Шаблон Angular не умеет раскладывать набор атрибутов, а наборы ядра стоят не
 * только на корне: `aria` поля — на вложенном `<input>`, `clearAria` — на
 * кнопке очистки, у коллекций — наборы частей и строк. Корень раскладывает
 * база компонента (`TComponentBase`), а прочие элементы шаблона — эта
 * директива, тем же правилом (`applyAttributes`): что называет набор, —
 * директивы, она пишет своё поверх того, что стоит на элементе, и снимает,
 * когда набор перестал имя называть; чего набор не называет, не трогает. Узел
 * не читает: помнит, что поставила, — поэтому и после гидратации напечатанное
 * сервером берёт своим с первой раскладки.
 *
 * Пишет в проходе шаблона владельца — сеттером входа, как привязку `[attr.x]`:
 * набор есть уже в первой отрисовке, и в разметке сервера тоже.
 *
 * Элемент бывает корнем вложенного компонента — кнопка очистки поля. Тогда на
 * него пишут двое: база кнопки — её наборы, и разметка владельца — свой набор.
 * Набор владельца главнее на общем имени, как атрибут снаружи у Vue и React:
 * `role="option"` строки перекрывает `role="button"`, который кнопка на `div`
 * пишет себе сама, при любом порядке записи. Пишут оба через один раскладчик
 * элемента (`TElementAttributes`): набор владельца — его верхний слой.
 *
 * Корень вложенного компонента бывает хостом, который отдаёт написанное на нём
 * узлу внутри (рендерер адаптера, `provideAttrs()`): поле `<div so-input>` в
 * шаблоне Select, элемент коллекции, ListBox и Tabs. Набор на нём — то же
 * написанное на хосте, что статика и привязки, и ложится туда же: директива
 * отдаёт его записи хоста (`TForwardedHost`), а та — своему узлу, `<input>`
 * или строке, поверх набора, который туда кладёт шаблон самого компонента.
 * Узел записи сам хост — набор идёт дальше по цепочке, как `v-bind` на
 * `<Input>` у Vue. Так `aria` Select доходит до `<input>` его поля.
 *
 * Своего набора у разметки без компонента нет: директива кладёт тот, что
 * держит владелец (`aria` поля, `clearAria`, у коллекций — `contentAria`).
 *
 * Selector: [so-attributes]
 */
@Directive({
	selector: '[so-attributes]',
	standalone: true,
})
export class AttributesDirective {
	private readonly _element = inject<ElementRef<Element>>(ElementRef).nativeElement

	/**
	 * Реестр рендерера адаптера: элемент бывает хостом в нём, и набор тогда —
	 * его записи. Без `provideAttrs()` реестра нет, а хостов в нём — тем более.
	 */
	private readonly _registry = inject(TForwardRegistry, { optional: true })

	/** Набор владельца: снимок набора ядра (`aria`, `clearAria`); нет — пустой. */
	@Input({ alias: 'so-attributes', required: true })
	set attributes(set: TAttributesMap | null | undefined) {
		// Хост компонент регистрирует в конструкторе, а он идёт раньше директив
		// того же элемента: к первой записи набора запись хоста уже есть
		const host = this._registry?.hostOf(this._element)

		if (host) host.setMarkup(attributesOf(set))
		else TElementAttributes.of(this._element).set('markup', attributesOf(set))
	}
}
