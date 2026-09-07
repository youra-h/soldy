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
		v-bind="containerAttrs"
	>
		<!--
			Вся ARIA таба — на элементе, который и есть таб. Раньше
			`aria-selected` стоял на внешней обёртке без роли, а `role="tab"` —
			здесь: для скринридера таб не был выбран никогда.

			Два источника, и это не случайность: `aria` — то, что таб знает о
			себе (role), `tab_aria` и `aria-selected` — то, что знает о нём
			коллекция (связка с панелью и активность).
		-->
		<Button
			:disabled="disabled"
			view="none"
			:size="size"
			:variant="variant"
			@click="context.adapters.activation.active = true"
			v-bind="{ ...aria, ...tab_aria, 'aria-selected': String(active), ...controlAttrs }"
		>
			<template #leading>
				<slot name="leading" />
			</template>

			<slot :text="text" :active="active">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
				<Button
					:rendered="!!tab_closable"
					class="s-tabs-item__close"
					@click.stop="context?.adapters?.tabs?.close()"
					view="plain"
				>
					<slot name="close-icon">
						<Icon :tag="closeIconTag" :size="size" />
					</slot>
				</Button>
			</template>
		</Button>
	</div>
</template>
