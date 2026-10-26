<script lang="ts">
	import { DropdownMenu } from 'bits-ui'

	/**
	 * The soldy menu preview in Bits: a group of checkboxes, a group of radios,
	 * actions with shortcuts, a submenu with a submenu inside, a disabled action
	 * and a destructive one — `DropdownMenu` has all the parts; shortcuts and
	 * the destructive look are the application's markup. The item with a
	 * calendar panel of soldy has no counterpart and is left out.
	 */
	let checked = $state(['grid'])
	let sort = $state('name')
</script>

{#snippet mark(on: boolean, sign: string)}<span aria-hidden="true">{on ? sign : ''}</span>{/snippet}

<DropdownMenu.Root>
	<DropdownMenu.Trigger>Действия</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content>
			<DropdownMenu.CheckboxGroup bind:value={checked}>
				<DropdownMenu.GroupHeading>Вид</DropdownMenu.GroupHeading>
				<DropdownMenu.CheckboxItem value="grid">
					{#snippet children({ checked: on })}{@render mark(on, '✓')} Сетка{/snippet}
				</DropdownMenu.CheckboxItem>
				<DropdownMenu.CheckboxItem value="ruler">
					{#snippet children({ checked: on })}{@render mark(on, '✓')} Линейка{/snippet}
				</DropdownMenu.CheckboxItem>
			</DropdownMenu.CheckboxGroup>
			<DropdownMenu.Separator />
			<DropdownMenu.RadioGroup bind:value={sort}>
				<DropdownMenu.GroupHeading>Сортировка</DropdownMenu.GroupHeading>
				<DropdownMenu.RadioItem value="name">
					{#snippet children({ checked: on })}{@render mark(on, '•')} По имени{/snippet}
				</DropdownMenu.RadioItem>
				<DropdownMenu.RadioItem value="date">
					{#snippet children({ checked: on })}{@render mark(on, '•')} По дате{/snippet}
				</DropdownMenu.RadioItem>
			</DropdownMenu.RadioGroup>
			<DropdownMenu.Separator />
			<DropdownMenu.Item>Изменить <kbd>Ctrl+E</kbd></DropdownMenu.Item>
			<DropdownMenu.Item>Дублировать <kbd>Ctrl+D</kbd></DropdownMenu.Item>
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>Поделиться ›</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<DropdownMenu.Item>Ссылка</DropdownMenu.Item>
					<DropdownMenu.Item>Почта</DropdownMenu.Item>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>Мессенджеры ›</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item>Telegram</DropdownMenu.Item>
							<DropdownMenu.Item>WhatsApp</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
			<DropdownMenu.Item disabled>В архив</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item style="color: #c62828">Удалить <kbd>Del</kbd></DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
