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
 * `dataset` — на обёртке: тема красит выбранный тег по `data-selected`, его
 * ставит `TSelectionExtension` всем элементам коллекции, как у Tabs.
 */
export default { ...SetupTagsItem, components: { Icon, Button } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
		:style="{ order: order }"
		v-bind="{ ...dataset, ...containerAttrs }"
	>
		<Button
			:tag="tag"
			:disabled="disabled"
			:size="size"
			:variant="variant"
			@click="context.adapters.selection.toggle()"
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
	</div>
</template>
