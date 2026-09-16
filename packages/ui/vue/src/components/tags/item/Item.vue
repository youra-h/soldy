<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupTagsItem from './setup.component'

/**
 * Разметка — копия Tabs.Item: внутренний Button рисует строку тега, кнопка
 * закрытия — вложенный Button со своим `aria-label` (`closeAria`).
 *
 * ARIA тега (`role`, `aria-selected`) приходит одним набором `aria` — пишет
 * его `TTagsExtension` в зависимости от режима выбора коллекции (`list`/
 * `listitem`, пока `mode === 'none'`, иначе `listbox`/`option`), шаблону об
 * этом знать незачем.
 *
 * `dataset` биндится дважды, как у `ListBox.Item`: тема красит выбранный тег
 * по `data-selected` на `.s-button` (миксины Button реагируют на атрибут
 * самого элемента), обёртка получает тот же набор для будущих контейнерных
 * стилей. `TSelectionExtension` пишет его всем элементам коллекции.
 *
 * `view` на внутреннем Button — вид со набора целиком (`TTags.view`,
 * дефолт `'filled'`), как у ListBox. `direction` — своё направление письма
 * тега; на обёртке уже стоит `dir`, но Button — интерактивный элемент со
 * своим DOM-узлом, и для него направление передаётся явно, а не только через
 * наследование `dir` от родителя.
 *
 * Тег строки фиксирован (`tag="div"`), а не берётся из `tag` элемента:
 * `tag` — тег корня (`TComponentView`), и рисует по нему корень
 * `<component :is>`. Под фиксированный тег строки написан и
 * `TTagsItem._ariaTag` — он решает, писать ли `aria-disabled`.
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
			tag="div"
			:view="view"
			:direction="direction"
			:disabled="disabled"
			:size="size"
			:variant="variant"
			@click="context?.adapters.selection.toggle()"
			v-bind="{ ...aria, ...dataset, ...controlAttrs }"
		>
			<template #leading>
				<slot name="leading" />
			</template>

			<slot :text="text" :selected="selected">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
				<!--
					Имя кнопки закрытия приходит из ядра вместе с текстом тега
					(«Close Настройки»), как у Tabs.
				-->
				<Button
					:rendered="!!tag_closable"
					class="s-tags-item__close"
					@click.stop="context?.adapters?.tags?.close()"
					view="plain"
					v-bind="closeAria"
				>
					<slot name="close-icon">
						<Icon :tag="closeIconTag" :size="size" />
					</slot>
				</Button>
			</template>
		</Button>
	</component>
</template>
