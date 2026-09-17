<script lang="ts">
import { TabsItem } from './item'
import SetupTabs from './setup.component'

export default { ...SetupTabs, components: { TabsItem } }
</script>

<template>
	<div ref="rootElement" v-if="rendered" v-show="visible" :class="classes" v-bind="attrs">
		<!--
			Набор `aria` владельца — это список табов: `role="tablist"` и
			`aria-orientation` пишет ядро, имя из `aria_label` — TAriaPlugin.
			Корень его не получает: там рядом со списком лежат панели.
		-->
		<div class="s-tabs__list" v-bind="aria">
			<div class="s-tabs__list--leading" v-if="$slots.leading">
				<slot name="leading"></slot>
			</div>
			<slot>
				<!--
					Слоты элементов статические и получают сам элемент через scope:
					динамические имена (`item:${value}:leading`) резолвит только Vue,
					в остальных пяти адаптерах они недостижимы. Адресация конкретного
					элемента — условием внутри слота по `item.value`.
				-->
				<TabsItem v-for="item in shown" :key="item.uid" :ctrl="item">
					<template #leading>
						<slot name="item-leading" :item="item" />
					</template>
					<template #default>
						<slot name="item" :item="item" />
					</template>
					<template #trailing>
						<slot name="item-trailing" :item="item" />
					</template>
				</TabsItem>
			</slot>
			<div class="s-tabs__list--trailing" v-if="$slots.trailing">
				<slot name="trailing"></slot>
			</div>
		</div>
		<slot name="content" />
	</div>
</template>
