import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { Button } from 'primeng/button'
import { Dialog } from 'primeng/dialog'
import { InputText } from 'primeng/inputtext'

/** A button opens a modal dialog with a field inside, as the soldy preview. */
@Component({
	selector: 'bench-dialog',
	imports: [Button, Dialog, InputText],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<p-button label="Открыть окно" (onClick)="shown.set(true)" />
		<p-dialog
			header="Настройки"
			[modal]="true"
			[visible]="shown()"
			(visibleChange)="shown.set($event)"
		>
			<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
			<input pInputText placeholder="Имя" />
			<ng-template #footer>
				<p-button label="Отмена" (onClick)="shown.set(false)" />
				<p-button label="Сохранить" (onClick)="shown.set(false)" />
			</ng-template>
		</p-dialog>
	`,
})
export default class DialogPage {
	readonly shown = signal(false)
}
