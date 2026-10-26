<script setup lang="ts">
import { ref } from 'vue'
import {
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuItemIndicator,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuRoot,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from 'reka-ui'

/**
 * The soldy menu preview in Reka: everything is the library's own part —
 * checkbox and radio items, group labels, submenus within submenus, a
 * disabled item. A destructive item and shortcuts are markup, as in shadcn-vue.
 */
defineOptions({ name: 'RekaMenuPage' })

const grid = ref(true)
const ruler = ref(false)
const sort = ref('name')
const PANEL = 'background: white; border: 1px solid; padding: 4px'
</script>

<template>
	<DropdownMenuRoot>
		<DropdownMenuTrigger>Действия</DropdownMenuTrigger>
		<DropdownMenuPortal>
			<DropdownMenuContent :style="PANEL">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Вид</DropdownMenuLabel>
					<DropdownMenuCheckboxItem v-model="grid">
						<DropdownMenuItemIndicator>✓</DropdownMenuItemIndicator>
						Сетка
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem v-model="ruler">
						<DropdownMenuItemIndicator>✓</DropdownMenuItemIndicator>
						Линейка
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Сортировка</DropdownMenuLabel>
				<DropdownMenuRadioGroup v-model="sort">
					<DropdownMenuRadioItem value="name">
						<DropdownMenuItemIndicator>•</DropdownMenuItemIndicator>
						По имени
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="date">
						<DropdownMenuItemIndicator>•</DropdownMenuItemIndicator>
						По дате
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					>Изменить <span style="opacity: 0.6">Ctrl+E</span></DropdownMenuItem
				>
				<DropdownMenuItem
					>Дублировать <span style="opacity: 0.6">Ctrl+D</span></DropdownMenuItem
				>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>Поделиться ›</DropdownMenuSubTrigger>
					<DropdownMenuPortal>
						<DropdownMenuSubContent :style="PANEL">
							<DropdownMenuItem>Ссылка</DropdownMenuItem>
							<DropdownMenuItem>Почта</DropdownMenuItem>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>Мессенджеры ›</DropdownMenuSubTrigger>
								<DropdownMenuPortal>
									<DropdownMenuSubContent :style="PANEL">
										<DropdownMenuItem>Telegram</DropdownMenuItem>
										<DropdownMenuItem>WhatsApp</DropdownMenuItem>
									</DropdownMenuSubContent>
								</DropdownMenuPortal>
							</DropdownMenuSub>
						</DropdownMenuSubContent>
					</DropdownMenuPortal>
				</DropdownMenuSub>
				<DropdownMenuItem disabled>В архив</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem style="color: crimson">
					Удалить <span style="opacity: 0.6">Del</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenuPortal>
	</DropdownMenuRoot>
</template>
