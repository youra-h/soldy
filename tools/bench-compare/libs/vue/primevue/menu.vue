<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import Button from 'primevue/button'
import TieredMenu from 'primevue/tieredmenu'
import type { MenuItem } from 'primevue/menuitem'

/**
 * The soldy menu preview in PrimeVue: `TieredMenu` as a popup — it has
 * submenus within submenus, separators and disabled items. Checkbox and radio
 * items and group labels it has not: they are items drawn by the `item` slot
 * with a mark and the state kept by the page, group labels are disabled
 * items, as the PrimeVue docs customize items.
 */
defineOptions({ name: 'PrimeMenuPage' })

const menu = useTemplateRef<InstanceType<typeof TieredMenu>>('menu')
const checked = ref(new Set(['grid']))
const sort = ref('name')

function toggle(value: string) {
	const next = new Set(checked.value)

	if (!next.delete(value)) next.add(value)

	checked.value = next
}

const items = computed<MenuItem[]>(() => [
	{ label: 'Вид', disabled: true, kind: 'label' },
	...[
		['grid', 'Сетка'],
		['ruler', 'Линейка'],
	].map(([key, label]) => ({
		key,
		label,
		kind: 'checkbox',
		mark: checked.value.has(key) ? '✓' : '',
		command: () => toggle(key),
	})),
	{ separator: true },
	{ label: 'Сортировка', disabled: true, kind: 'label' },
	...[
		['name', 'По имени'],
		['date', 'По дате'],
	].map(([key, label]) => ({
		key,
		label,
		kind: 'radio',
		mark: sort.value === key ? '•' : '',
		command: () => {
			sort.value = key
		},
	})),
	{ separator: true },
	{ label: 'Изменить', shortcut: 'Ctrl+E' },
	{ label: 'Дублировать', shortcut: 'Ctrl+D' },
	{
		label: 'Поделиться',
		items: [
			{ label: 'Ссылка' },
			{ label: 'Почта' },
			{ label: 'Мессенджеры', items: [{ label: 'Telegram' }, { label: 'WhatsApp' }] },
		],
	},
	{ label: 'В архив', disabled: true },
	{ separator: true },
	{ label: 'Удалить', shortcut: 'Del', danger: true },
])
</script>

<template>
	<Button
		label="Действия"
		aria-haspopup="menu"
		@click="(event: MouseEvent) => menu?.toggle(event)"
	/>
	<TieredMenu ref="menu" :model="items" popup>
		<template #item="{ item, hasSubmenu }">
			<span
				:data-kind="item.kind ?? 'action'"
				:style="{
					display: 'flex',
					gap: '8px',
					padding: '6px 12px',
					color: item.danger ? 'var(--p-red-500)' : undefined,
					fontWeight: item.kind === 'label' ? 600 : undefined,
				}"
			>
				<span v-if="item.kind === 'checkbox' || item.kind === 'radio'" style="width: 12px">
					{{ item.mark }}
				</span>
				<span style="flex: 1">{{ item.label }}</span>
				<span v-if="item.shortcut" style="opacity: 0.6">{{ item.shortcut }}</span>
				<span v-if="hasSubmenu">›</span>
			</span>
		</template>
	</TieredMenu>
</template>
