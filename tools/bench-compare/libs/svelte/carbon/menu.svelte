<script lang="ts">
	import {
		MenuButton,
		MenuDivider,
		MenuItem,
		MenuItemGroup,
		MenuItemRadioGroup,
	} from 'carbon-components-svelte'
</script>

<!--
	The soldy menu preview in Carbon: a group of checkboxes, a group of radios,
	actions with shortcuts, a submenu with a submenu inside, a disabled action
	and a destructive one (`kind="danger"`) — all native to `MenuButton`. The
	item with a calendar panel of soldy has no counterpart and is left out.
-->
<MenuButton labelText="Действия">
	<MenuItemGroup labelText="Вид">
		<MenuItem id="grid" labelText="Сетка" selected />
		<MenuItem id="ruler" labelText="Линейка" />
	</MenuItemGroup>
	<MenuDivider />
	<MenuItemRadioGroup labelText="Сортировка" selectedId="name">
		<MenuItem id="name" labelText="По имени" />
		<MenuItem id="date" labelText="По дате" />
	</MenuItemRadioGroup>
	<MenuDivider />
	<MenuItem labelText="Изменить" shortcutText="Ctrl+E" />
	<MenuItem labelText="Дублировать" shortcutText="Ctrl+D" />
	<MenuItem labelText="Поделиться">
		<MenuItem labelText="Ссылка" />
		<MenuItem labelText="Почта" />
		<MenuItem labelText="Мессенджеры">
			<MenuItem labelText="Telegram" />
			<MenuItem labelText="WhatsApp" />
		</MenuItem>
	</MenuItem>
	<MenuItem labelText="В архив" disabled />
	<MenuDivider />
	<MenuItem labelText="Удалить" kind="danger" shortcutText="Del" />
</MenuButton>
