<script lang="ts">
	import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'
	import { Button, Calendar, Menu } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'
	import { getParts } from './events'

	type TTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

	const bind: TPreviewProps = $props()
	const parts = getParts()
</script>

<!--
	The trigger is a Button that takes the menu binding and the pressed look from
	the scope of the `trigger` snippet. With `openOn: 'contextmenu'` the snippet
	holds an area instead, like a "file" in an app: right click, long press or
	Shift+F10 over it opens the menu at that point. The area is a native button,
	as in Vue: focusable for Shift+F10, with its own role and name, unbound from
	the menu. The mode comes from the column's props: the instance column has
	none and opens the menu over the button.

	Items in markup, as in Vue: a labelled checkbox group, a radio group with
	one item checked, actions with shortcut hints, a submenu with a submenu
	inside, an item with a panel — a calendar mounted on the first open — a
	disabled action and a "dangerous" item of its own variant. Items that come
	as data (`items` from the groups block) are used instead: markup would
	replace the data, and the menu draws groups from data.
-->
{#snippet trigger({ triggerAria, triggerDataset }: TTriggerScope)}
	{#if bind.openOn === 'contextmenu'}
		<button type="button" style="padding: 24px 32px; border: 1px dashed; border-radius: 8px">
			Правая кнопка, долгое касание или Shift+F10
		</button>
	{:else}
		<Button text="Действия" {...triggerAria} {...triggerDataset} />
	{/if}
{/snippet}

{#snippet edit()}Ctrl+E{/snippet}
{#snippet copy()}Ctrl+D{/snippet}
{#snippet remove()}Del{/snippet}

{#if bind.items}
	<Menu {...bind} {trigger} />
{:else}
	<Menu {...bind} {trigger}>
		<Menu.Group label="Вид">
			<Menu.CheckboxItem value="grid" text="Сетка" selected {...parts.CheckboxItem} />
			<Menu.CheckboxItem value="ruler" text="Линейка" {...parts.CheckboxItem} />
		</Menu.Group>
		<Menu.Separator />
		<Menu.RadioGroup label="Сортировка" value="name">
			<Menu.RadioItem value="name" text="По имени" {...parts.RadioItem} />
			<Menu.RadioItem value="date" text="По дате" {...parts.RadioItem} />
		</Menu.RadioGroup>
		<Menu.Separator />
		<Menu.Item value="edit" text="Изменить" trailing={edit} {...parts.Item} />
		<Menu.Item value="copy" text="Дублировать" trailing={copy} {...parts.Item} />
		<Menu.Submenu value="share" text="Поделиться" {...parts.Submenu}>
			<Menu.Item value="link" text="Ссылка" {...parts.Item} />
			<Menu.Item value="mail" text="Почта" {...parts.Item} />
			<Menu.Submenu value="messengers" text="Мессенджеры" {...parts.Submenu}>
				<Menu.Item value="telegram" text="Telegram" {...parts.Item} />
				<Menu.Item value="whatsapp" text="WhatsApp" {...parts.Item} />
			</Menu.Submenu>
		</Menu.Submenu>
		<Menu.PopoverItem value="due" text="Срок" lazyMount {...parts.PopoverItem}>
			<Calendar />
		</Menu.PopoverItem>
		<Menu.Item value="archive" text="В архив" disabled {...parts.Item} />
		<Menu.Separator />
		<Menu.Item value="remove" text="Удалить" variant="negative" trailing={remove} {...parts.Item} />
	</Menu>
{/if}
