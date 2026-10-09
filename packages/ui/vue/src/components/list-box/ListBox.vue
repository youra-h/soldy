<script lang="ts">
import { ListBoxItem } from './item'
import SetupListBox from './setup.component'

export default { ...SetupListBox, components: { ListBoxItem } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		tabindex="0"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<slot name="header" />
		<slot>
			<!--
				Элементы — то, что рисует коллекция (`drawn`), по порядку, ключ —
				ключ записи. Без окна это все показанные элементы. В окне обёртки
				`Virtual` — видимые и распорки на месте пропущенных: `div` под
				`aria-hidden`, высоту которого тема берёт из его стиля. Одна петля на
				элементы и распорки: петли по блокам перемонтировали бы элемент,
				когда он переходит из блока в блок.

				Слоты элементов статические и получают элемент через scope —
				динамические имена резолвит только Vue (см. Tabs.vue).
			-->
			<template v-for="entry in drawn" :key="entry.key">
				<div
					v-if="entry.kind === 'filler'"
					class="s-list-box__filler"
					aria-hidden="true"
					:style="entry.style"
				></div>
				<ListBoxItem v-else :ctrl="entry.item">
					<template #leading>
						<slot name="item-leading" :item="entry.item" />
					</template>
					<template #default>
						<slot name="item" :item="entry.item" />
					</template>
					<template #trailing>
						<slot name="item-trailing" :item="entry.item" />
					</template>
				</ListBoxItem>
			</template>
		</slot>
		<slot name="footer" />
	</div>
</template>
