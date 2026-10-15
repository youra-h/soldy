import { Directive, ElementRef, Input, inject } from '@angular/core'
import type { TAttributesMap } from '@soldy-ui/core'
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
	/** Раскладчик элемента — общий с базой компонента, если элемент — его корень. */
	private readonly _attributes = TElementAttributes.of(
		inject<ElementRef<Element>>(ElementRef).nativeElement,
	)

	/** Набор владельца: снимок набора ядра (`aria`, `clearAria`); нет — пустой. */
	@Input({ alias: 'so-attributes', required: true })
	set attributes(set: TAttributesMap | null | undefined) {
		this._attributes.set('markup', attributesOf(set))
	}
}
