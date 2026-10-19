import { Pipe, type PipeTransform } from '@angular/core'
import { toText } from '@soldy-ui/core'

/**
 * TextPipe — значение текстом в шаблоне: `{{ value | soText }}`. Правило —
 * `toText` ядра, тот же текст, что у ячейки таблицы без шаблона (`cell.text`):
 * своего перевода у адаптера нет.
 *
 * Функцию ядра шаблон Angular сам не вызовет, поэтому её отдаёт шаблону пайп.
 * Нужен он шаблону потребителя: шаблон `cell` таблицы непрозрачен — заданный,
 * он рисуется в каждой ячейке, — и текст остальных колонок потребитель рисует
 * сам. Им же колонка пишет ширину на поле ручки.
 *
 * Чистый пайп: Angular зовёт его, только когда сменилось само значение. Имя — с
 * префиксом `so`: имена пайпов у шаблона общие с приложением, как селекторы.
 *
 * Name: soText
 */
@Pipe({
	name: 'soText',
	standalone: true,
})
export class TextPipe implements PipeTransform {
	transform(value: unknown): string {
		return toText(value)
	}
}
