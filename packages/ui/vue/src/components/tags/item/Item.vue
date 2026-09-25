<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupTagsItem from './setup.component'

/**
 * Разметка — по образцу Tabs.Item: в корне два соседа — строка тега
 * (внутренний Button) и кнопка закрытия со своим `aria-label` (`closeAria`).
 *
 * ARIA тега (`role`, `aria-selected`) приходит одним набором `aria` — пишет
 * его `TTagsExtension` в зависимости от режима выбора коллекции (`list`/
 * `listitem`, пока `mode === 'none'`, иначе `listbox`/`option`), шаблону об
 * этом знать незачем.
 *
 * `dataset` — на корне: пилюлю тега рисует он (см. ниже), и выбранный тег
 * тема красит по `data-selected` корня. `TSelectionExtension` пишет его всем
 * элементам коллекции.
 *
 * Вид набора (`TTags.view`) рисует корень, а не строка: фон, рамка, наведение
 * и выбор обязаны покрывать и кнопку закрытия, а она стоит рядом со строкой.
 * Тема читает вид с класса набора. Строке и крестику вид в разметке не
 * передаётся — значения вида объявляет тема, и части тега она красит по
 * контексту (`.s-tags-item`).
 *
 * `direction` — своё направление письма тега; на корне уже стоит `dir`, но
 * Button — интерактивный элемент со своим DOM-узлом, и для него направление
 * передаётся явно, а не только через наследование `dir` от родителя.
 *
 * `embedded` — имя места у строки, крестика и иконки: это детали тега, и
 * плагины приложения на Button (`usePlugins`) их по умолчанию не трогают.
 *
 * Тег строки фиксирован (`tag="div"`), а не берётся из `tag` элемента:
 * `tag` — тег корня (`TComponentView`), и рисует по нему корень
 * `<component :is>`. Под фиксированный тег строки написан и
 * `TTagsItem._ariaTag` — он решает, писать ли `aria-disabled`.
 *
 * Выбор — по `action:press` строки, а не по `click`. Строка — `div`, фокус
 * держит она сама, а клика из Enter и пробела на `div` браузер не делает: на
 * `click` тег выбирался только мышью. `press` её `TActionPlugin` приходит и
 * на клик, и на клавишу и не приходит на выключенный тег.
 * `TSelectionExtension.toggle` выключенность не проверяет — программный выбор
 * выключенного элемента остаётся правом приложения, — и на `click`
 * выключенный тег выбирался.
 *
 * `tabindex` строки приходит в том же наборе `aria` и перекрывает остановку,
 * которую `Button` на `div` ставит себе сам: с выбором весь набор — одна
 * остановка Tab (`tabindex="0"` у одного тега, у остальных `-1`, между тегами
 * — стрелки), без выбора у строк `-1`. Пишет его `TTagsExtension`, шаблон
 * ничего не вычисляет.
 */
export default { ...SetupTagsItem, components: { Icon, Button } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="{ order: order }"
		v-bind="{ ...dataset, ...containerAttrs, ...attrs }"
	>
		<Button
			embedded="tags.row"
			tag="div"
			:direction="direction"
			:disabled="disabledResolved"
			:size="size"
			:variant="variant"
			@action:press="context?.adapters.selection.toggle()"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<template #leading>
				<slot name="leading" />
			</template>

			<slot :text="text" :selected="selected">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
			</template>
		</Button>

		<!--
			Кнопка закрытия — сосед строки, а не её часть. В режиме выбора
			строка — `role="option"`: потомки опции для скринридера
			презентационны, а имя опции считается из содержимого. Внутри строки
			крестик не был кнопкой, и его подпись приклеивалась к названию тега:
			«Настройки Close Настройки».

			Имя кнопки приходит из ядра вместе с текстом тега («Close Настройки»).
			Без него у кнопки нет имени вообще, а с одним лишь «Close» все кнопки
			набора неразличимы в списке элементов скринридера.

			В том же наборе `closeAria` приходит `tabindex`: с выбором кнопка из
			порядка Tab выведена (`-1`) — внутри listbox второй остановки быть не
			должно, тег закрывает Delete; без выбора атрибута нет, и нативная
			кнопка остаётся остановкой — иначе тег с клавиатуры не закрыть.

			`size` и `disabled` — явно: от строки кнопка их больше не наследует.
			От размера зависит кегль, от кегля — иконка; выключенный тег
			выключает и свою кнопку. Место рядом со строкой держит тема
			(`.s-tags-item`).
		-->
		<Button
			embedded="tags.close"
			:rendered="!!tag_closable"
			class="s-tags-item__close"
			:disabled="disabledResolved"
			:size="size"
			@click.stop="context?.adapters?.tags?.close()"
			v-bind="closeAria"
		>
			<slot name="close-icon">
				<Icon embedded="tags.close-icon" :tag="closeIconTag" :size="size" />
			</slot>
		</Button>
	</component>
</template>
