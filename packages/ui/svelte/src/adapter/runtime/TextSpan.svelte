<script lang="ts">
	import { BROWSER } from 'esm-env'
	import type { Attachment } from 'svelte/attachments'
	import type { HTMLAttributes } from 'svelte/elements'

	type TTextSpanProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		/** Текст узла — целиком; `undefined` — пусто. */
		text: string | undefined
	}

	const { text, ...attributes }: TTextSpanProps = $props()

	/**
	 * Текст — в узел свойством `textContent`, и только когда он разошёлся с
	 * узлом. Attachment выполняется эффектом и перечитывает текст при каждой его
	 * смене; заводится он один раз на компонент.
	 */
	const write: Attachment<HTMLSpanElement> = (node) => {
		const content = text ?? ''

		if (node.textContent !== content) node.textContent = content
	}
</script>

<!--
	TextSpan — `span`, чей текст пишет только он сам, свойством `textContent`,
	как текст элемента пишут Vue, React и Solid. Так рисуется часть поля даты.

	Свой текст Svelte держит в своём текстовом узле и меняет его данные
	(`nodeValue`). А на касание часть поля даты редактируемая: браузер правит её
	сам — композиция, клавиатура, которая стирает и после погашенного
	Backspace, — и оставляет пустой или из других узлов, а сенсорный плагин
	возвращает ей текст ядра записью `textContent`. Узел Svelte после этого вне
	документа, его запись уходит мимо, и часть так и осталась бы пустой.
	`textContent` компилятор ставит только тексту, который не меняется, а
	`bind:textContent` требует статического `contenteditable`.

	Поэтому в браузере у содержимого узла один писатель — attachment: в `span`
	нет ни текстового узла Svelte, ни якоря блока. Attachment пишет весь текст,
	и только когда он разошёлся с узлом: перерисовка с тем же текстом узел не
	трогает, а часть, которую браузер оставил пустой, получает текст ядра одним
	узлом. Узел — именно `span`, а не `<svelte:element>`: тот кладёт в элемент
	свой пустой текстовый узел — якорь содержимого — и был бы вторым писателем.

	На сервере attachment-ов нет, и текст — содержимое узла. Ветка `{#if}` у
	сервера и браузера разная (`BROWSER` из `esm-env`, как у стиля корня):
	при гидратации Svelte снимает узел сервера вместе с его текстом и рисует
	ветку браузера заново — в части текст ядра одним узлом, без остатка
	серверного. Расхождение ветки при гидратации Svelte разбирает сам, без
	предупреждения. Пересобранный узел никто ещё не держит: плагины поля
	находят части в корне, когда придёт его `ready`, — кадром после гидратации.
-->
{#if BROWSER}<span {...attributes} {@attach write}></span>{:else}<span {...attributes}
		>{text}</span
	>{/if}
