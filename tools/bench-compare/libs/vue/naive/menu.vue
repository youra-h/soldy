<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { NButton, NDropdown, type DropdownOption } from 'naive-ui'

/**
 * The soldy menu preview in Naive: a group of checkboxes, a group of radios,
 * actions with shortcuts, a submenu with a submenu inside, a disabled action
 * and a destructive one. `NDropdown` has groups, submenus and disabled options
 * but no checkbox or radio options: they are options with a role (`node-props`), a mark icon
 * and the state kept by the page, as the Naive docs render custom options.
 */
defineOptions({ name: 'NaiveMenuPage' })

const checked = ref(new Set(['grid']))
const sort = ref('name')

const mark = (on: boolean, sign: string) => () => h('span', on ? sign : '')
const shortcut = (text: string) => () => h('span', { style: 'opacity: 0.6' }, text)

const options = computed<DropdownOption[]>(() => [
	{
		type: 'group',
		label: 'Вид',
		key: 'view',
		children: [
			['grid', 'Сетка'],
			['ruler', 'Линейка'],
		].map(([key, label]) => ({
			key,
			label,
			icon: mark(checked.value.has(key), '✓'),
			role: 'menuitemcheckbox',
			checked: checked.value.has(key),
		})),
	},
	{ type: 'divider', key: 'd1' },
	{
		type: 'group',
		label: 'Сортировка',
		key: 'sort',
		children: [
			['name', 'По имени'],
			['date', 'По дате'],
		].map(([key, label]) => ({
			key,
			label,
			icon: mark(sort.value === key, '•'),
			role: 'menuitemradio',
			checked: sort.value === key,
		})),
	},
	{ type: 'divider', key: 'd2' },
	{ key: 'edit', label: 'Изменить', extra: shortcut('Ctrl+E') },
	{ key: 'copy', label: 'Дублировать', extra: shortcut('Ctrl+D') },
	{
		key: 'share',
		label: 'Поделиться',
		children: [
			{ key: 'link', label: 'Ссылка' },
			{ key: 'mail', label: 'Почта' },
			{
				key: 'messengers',
				label: 'Мессенджеры',
				children: [
					{ key: 'telegram', label: 'Telegram' },
					{ key: 'whatsapp', label: 'WhatsApp' },
				],
			},
		],
	},
	{ key: 'archive', label: 'В архив', disabled: true },
	{ type: 'divider', key: 'd3' },
	{ key: 'remove', label: 'Удалить', extra: shortcut('Del'), danger: true },
])

/** The node of an option: the role, the state of checkbox and radio options, the destructive color. */
function nodeProps(option: DropdownOption) {
	return {
		role: typeof option.role === 'string' ? option.role : option.type ? undefined : 'menuitem',
		'aria-checked': typeof option.checked === 'boolean' ? option.checked : undefined,
		style: option.danger ? 'color: #d03050' : undefined,
	}
}

function select(key: string | number) {
	const value = String(key)

	if (value === 'grid' || value === 'ruler') {
		const next = new Set(checked.value)

		if (!next.delete(value)) next.add(value)

		checked.value = next
	} else if (value === 'name' || value === 'date') {
		sort.value = value
	}
}
</script>

<template>
	<NDropdown trigger="click" :node-props="nodeProps" :options="options" @select="select">
		<NButton aria-haspopup="menu">Действия</NButton>
	</NDropdown>
</template>
