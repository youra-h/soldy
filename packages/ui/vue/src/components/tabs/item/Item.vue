<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupTabsItem from './setup.component'

export default { ...SetupTabsItem, components: { Icon, Button } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
		:style="{ order: order }"
		:data-selected="String(active)"
		v-bind="containerAttrs"
	>
		<!--
			Вся ARIA таба — на элементе, который и есть таб. Раньше
			`aria-selected` стоял на внешней обёртке без роли, а `role="tab"` —
			здесь: для скринридера таб не был выбран никогда.

			Набор один. В него пишут ядро (`role`), расширение коллекции
			(`aria-selected`) и проводка панели (`id`, `aria-controls`) — но
			шаблону об этом знать незачем. `controlAttrs` рядом — это сквозные
			атрибуты Vue, чужая сущность.

			`data-selected` на обёртке — то же состояние для CSS: тема красит
			активный таб по нему. ARIA — для скринридера, `data-*` — для стилей;
			смешивать нельзя, иначе правка ARIA ломает вид.
		-->
		<Button
			:disabled="disabled"
			view="none"
			:size="size"
			:variant="variant"
			@click="context.adapters.activation.active = true"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<template #leading>
				<slot name="leading" />
			</template>

			<slot :text="text" :active="active">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
				<!--
					Имя кнопки закрытия приходит из ядра вместе с текстом таба
					(«Close Настройки»). Без него у кнопки нет имени вообще, а с
					одним лишь «Close» все кнопки набора неразличимы в списке
					элементов скринридера.
				-->
				<Button
					:rendered="!!tab_closable"
					class="s-tabs-item__close"
					@click.stop="context?.adapters?.tabs?.close()"
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
