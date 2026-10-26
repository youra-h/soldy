<script setup lang="ts">
import { ref } from 'vue'
import { VBtn } from 'vuetify/components/VBtn'
import { VDivider } from 'vuetify/components/VDivider'
import { VList, VListItem, VListSubheader } from 'vuetify/components/VList'
import { VMenu } from 'vuetify/components/VMenu'

/**
 * The soldy menu preview in Vuetify: `VMenu` with a `VList`. Vuetify has no
 * checkbox or radio items: they are list items with `role`, a mark and the
 * state kept by the page; a submenu is a nested `VMenu` on its item — the
 * way the Vuetify docs build them.
 */
defineOptions({ name: 'VuetifyMenuPage' })

const checked = ref(new Set(['grid']))
const sort = ref('name')

function toggle(value: string) {
	const next = new Set(checked.value)

	if (!next.delete(value)) next.add(value)

	checked.value = next
}

const VIEW = [
	['grid', 'Сетка'],
	['ruler', 'Линейка'],
]
const SORT = [
	['name', 'По имени'],
	['date', 'По дате'],
]
</script>

<template>
	<VMenu>
		<template #activator="{ props }">
			<VBtn v-bind="props">Действия</VBtn>
		</template>
		<VList density="compact">
			<VListSubheader>Вид</VListSubheader>
			<VListItem
				v-for="[value, text] in VIEW"
				:key="value"
				role="menuitemcheckbox"
				:aria-checked="checked.has(value)"
				:title="text"
				@click="toggle(value)"
			>
				<template #prepend>
					<span style="width: 24px">{{ checked.has(value) ? '✓' : '' }}</span>
				</template>
			</VListItem>
			<VDivider />
			<VListSubheader>Сортировка</VListSubheader>
			<VListItem
				v-for="[value, text] in SORT"
				:key="value"
				role="menuitemradio"
				:aria-checked="sort === value"
				:title="text"
				@click="sort = value"
			>
				<template #prepend>
					<span style="width: 24px">{{ sort === value ? '•' : '' }}</span>
				</template>
			</VListItem>
			<VDivider />
			<VListItem role="menuitem" title="Изменить">
				<template #append><span style="opacity: 0.6">Ctrl+E</span></template>
			</VListItem>
			<VListItem role="menuitem" title="Дублировать">
				<template #append><span style="opacity: 0.6">Ctrl+D</span></template>
			</VListItem>
			<VMenu location="end">
				<template #activator="{ props: share }">
					<VListItem
						v-bind="share"
						role="menuitem"
						title="Поделиться"
						append-icon="$next"
					/>
				</template>
				<VList density="compact">
					<VListItem role="menuitem" title="Ссылка" />
					<VListItem role="menuitem" title="Почта" />
					<VMenu location="end">
						<template #activator="{ props: messengers }">
							<VListItem
								v-bind="messengers"
								role="menuitem"
								title="Мессенджеры"
								append-icon="$next"
							/>
						</template>
						<VList density="compact">
							<VListItem role="menuitem" title="Telegram" />
							<VListItem role="menuitem" title="WhatsApp" />
						</VList>
					</VMenu>
				</VList>
			</VMenu>
			<VListItem role="menuitem" title="В архив" disabled />
			<VDivider />
			<VListItem role="menuitem" title="Удалить" base-color="error">
				<template #append><span style="opacity: 0.6">Del</span></template>
			</VListItem>
		</VList>
	</VMenu>
</template>
