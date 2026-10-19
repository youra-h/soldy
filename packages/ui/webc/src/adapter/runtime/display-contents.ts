/**
 * Элемент адаптера без своей коробки: место в раскладке — у его детей, как
 * будто элемента нет.
 *
 * Так стоят элементы, у которых в остальных адаптерах узла нет вовсе: провайдер
 * локали `<so-locale-provider>` — у фреймворков это контекст — и окно
 * `<so-virtual>` — у Vue и React обёртка `Virtual` своего узла не рисует.
 * Теневой корень несёт только `<slot>` и `:host { display: contents }`:
 * содержимое остаётся светом — его раскладывает родитель элемента, а стили
 * документа до него доходят. Правило `:host` слабее стилей документа, и
 * `display` потребителя главнее.
 *
 * Коробки нет, а узел в дереве документа есть: селектор с дочерним
 * комбинатором (`.parent > .child`) через него не проходит.
 *
 * В бочку адаптера не входит: это механика элементов адаптера.
 */

/** Правило теневого корня: своей коробки у элемента нет. */
const HOST_STYLE = ':host { display: contents }'

/** Убрать у элемента коробку — теневой корень со `<slot>` и правилом `:host`. */
export function displayContents(element: HTMLElement): void {
	const { ownerDocument } = element
	const style = ownerDocument.createElement('style')

	style.textContent = HOST_STYLE
	element.attachShadow({ mode: 'open' }).append(style, ownerDocument.createElement('slot'))
}
