<template>
	<div class="so-textarea">
		<!--
			Корень рисуется по `tag`, по умолчанию `div`, как у Input: `tag` —
			всегда тег корня. На корне — модификаторы (`--size-*`, `--variant-*`,
			`--readonly`, `--required`) и `dataset`: `data-disabled`,
			`data-invalid` и `data-limit` (`reached` — набрано ровно
			`maxlength`, `exceeded` — больше). Тема красит рамку и счётчик по
			корню, а `aria` — у вложенной `<textarea>`.
		-->
		<!--
			Поле без класса, как `<input>` у Input. Нативные атрибуты — `id`,
			`name`, `rows`, `maxlength`, `disabled`, `readonly`, `required`,
			`placeholder`; `aria` и атрибуты потребителя — сюда же. Высоту
			тема не задаёт: её ведут `rows`, ручка и плагин автороста —
			инлайновой `height` на этом узле.
		-->
		<textarea></textarea>
		<!--
			Счётчик символов — только при `counter`. Стоит в рамке, под полем:
			подсказка и ошибка `Field` встают под всем компонентом. Текст —
			набрано и предел (`12 / 200`), без `maxlength` — одно число (`12`).
		-->
		<div class="so-textarea__counter">12 / 200</div>
	</div>
</template>
