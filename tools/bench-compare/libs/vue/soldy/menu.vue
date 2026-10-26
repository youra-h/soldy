<script setup lang="ts">
import { Button, Calendar, Menu } from '@soldy-ui/vue'

defineOptions({ name: 'SoldyMenuPage' })
</script>

<template>
	<Menu>
		<template #trigger="{ triggerAria, triggerDataset }">
			<Button text="Действия" v-bind="{ ...triggerAria, ...triggerDataset }" />
		</template>
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
		<Menu.Item value="edit" text="Изменить"><template #trailing>Ctrl+E</template></Menu.Item>
		<Menu.Item value="copy" text="Дублировать"><template #trailing>Ctrl+D</template></Menu.Item>
		<Menu.Submenu value="share" text="Поделиться">
			<Menu.Item value="link" text="Ссылка" />
			<Menu.Item value="mail" text="Почта" />
			<Menu.Submenu value="messengers" text="Мессенджеры">
				<Menu.Item value="telegram" text="Telegram" />
				<Menu.Item value="whatsapp" text="WhatsApp" />
			</Menu.Submenu>
		</Menu.Submenu>
		<Menu.PopoverItem value="due" text="Срок" lazy-mount><Calendar /></Menu.PopoverItem>
		<Menu.Item value="archive" text="В архив" disabled />
		<Menu.Separator />
		<Menu.Item value="remove" text="Удалить" variant="negative">
			<template #trailing>Del</template>
		</Menu.Item>
	</Menu>
</template>
