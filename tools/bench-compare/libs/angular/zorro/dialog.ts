import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzModalModule } from 'ng-zorro-antd/modal'

/** A button opens a modal with a field inside, as the soldy preview. */
@Component({
	selector: 'bench-dialog',
	imports: [NzButtonModule, NzInputModule, NzModalModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button nz-button (click)="shown.set(true)">Открыть окно</button>
		<nz-modal
			nzTitle="Настройки"
			[nzVisible]="shown()"
			(nzVisibleChange)="shown.set($event)"
			(nzOnCancel)="shown.set(false)"
			[nzFooter]="footer"
		>
			<ng-container *nzModalContent>
				<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
				<input nz-input placeholder="Имя" />
			</ng-container>
		</nz-modal>
		<ng-template #footer>
			<button nz-button (click)="shown.set(false)">Отмена</button>
			<button nz-button (click)="shown.set(false)">Сохранить</button>
		</ng-template>
	`,
})
export default class DialogPage {
	readonly shown = signal(false)
}
