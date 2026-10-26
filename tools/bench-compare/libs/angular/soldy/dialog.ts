import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { TButtonComponent, TDialogComponent, TInputComponent } from '@soldy-ui/angular'

/** The preview of `packages/playground/vue/src/hosts/angular/templates.ts` (`DialogPreview`). */
@Component({
	selector: 'bench-dialog',
	imports: [TDialogComponent, TButtonComponent, TInputComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<button so-button text="Открыть окно" (click)="shown.set(true)"></button>
		<div so-dialog [visible]="shown()" (soChangeVisible)="shown.set($event)">
			<span slot="title">Настройки</span>
			<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
			<div so-input placeholder="Имя"></div>
			<button so-button slot="footer" text="Отмена" (click)="shown.set(false)"></button>
			<button so-button slot="footer" text="Сохранить" (click)="shown.set(false)"></button>
		</div>
	`,
})
export default class DialogPage {
	readonly shown = signal(false)
}
