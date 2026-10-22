<script lang="ts">
	import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'
	import { Button, Input, Menu } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	type TTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

	const bind: TPreviewProps = $props()
</script>

<!--
	Триггер — Button, связку с меню и вид «нажата» он берёт из scope сниппета
	`trigger`. У контекстного меню (`openOn: 'contextmenu'`) в сниппете область,
	как «файл» у потребителя: меню вызывают над ней правой кнопкой, долгим
	касанием и Shift+F10, и панель встаёт у точки вызова. Область — нативная
	кнопка, как у Vue: под фокусом для Shift+F10, со своими ролью и именем и без
	связки с меню. Режим область берёт из пропсов колонки, как у Vue: у колонки
	экземпляра его нет, и там меню вызывают над кнопкой.

	Пункты — разметкой, как у Vue: группа флажков с подписью, группа
	переключателей — отмечен один, — действия с подсказками сочетаний, подменю
	с подменю внутри, пункт с панелью, которая монтируется с первым открытием,
	выключенное действие и «опасный» пункт своего варианта. Пришли данными
	(`items` блока групп страницы) — из них: разметка заменила бы данные, а
	группы меню рисует из данных.

	Отличие от Vue — содержимое панели пункта «Срок»: у Vue там календарь, а
	Calendar в адаптере Svelte ещё нет (задача 16.6.5), и до него в панели —
	поле с кнопкой. Панель та же: произвольное содержимое и `lazyMount`.
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
			<div style="display: flex; gap: 8px; align-items: center">
				<Input placeholder="ДД.ММ.ГГГГ" aria_label="Срок" />
				<Button text="Готово" />
			</div>
		</Menu.PopoverItem>
		<Menu.Item value="archive" text="В архив" disabled />
		<Menu.Separator />
		<Menu.Item value="remove" text="Удалить" variant="negative" trailing={remove} />
	</Menu>
{/if}
