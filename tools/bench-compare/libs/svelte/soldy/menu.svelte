<script lang="ts">
	import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'
	import { Button, Calendar, Menu } from '@soldy-ui/svelte'

	type TTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']
</script>

{#snippet trigger({ triggerAria, triggerDataset }: TTriggerScope)}
	<Button text="Действия" {...triggerAria} {...triggerDataset} />
{/snippet}

{#snippet edit()}Ctrl+E{/snippet}
{#snippet copy()}Ctrl+D{/snippet}
{#snippet remove()}Del{/snippet}

<Menu {trigger}>
	<Menu.Group label="Вид">
		<Menu.CheckboxItem value="grid" text="Сетка" selected />
		<Menu.CheckboxItem value="ruler" text="Линейка" />
	</Menu.Group>
	<Menu.Separator />
	<Menu.RadioGroup label="Сортировка" value="name">
		<Menu.RadioItem value="name" text="По имени" />
		<Menu.RadioItem value="date" text="По дате" />
	</Menu.RadioGroup>
	<Menu.Separator />
	<Menu.Item value="edit" text="Изменить" trailing={edit} />
	<Menu.Item value="copy" text="Дублировать" trailing={copy} />
	<Menu.Submenu value="share" text="Поделиться">
		<Menu.Item value="link" text="Ссылка" />
		<Menu.Item value="mail" text="Почта" />
		<Menu.Submenu value="messengers" text="Мессенджеры">
			<Menu.Item value="telegram" text="Telegram" />
			<Menu.Item value="whatsapp" text="WhatsApp" />
		</Menu.Submenu>
	</Menu.Submenu>
	<Menu.PopoverItem value="due" text="Срок" lazyMount>
		<Calendar />
	</Menu.PopoverItem>
	<Menu.Item value="archive" text="В архив" disabled />
	<Menu.Separator />
	<Menu.Item value="remove" text="Удалить" variant="negative" trailing={remove} />
</Menu>
