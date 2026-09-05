import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { EventLogComponent } from './common/event-log.component'
import { EventLogService } from './common/event-log.service'
import { ButtonPlaygroundComponent } from './playgrounds/button-playground.component'
import { ComponentViewPlaygroundComponent } from './playgrounds/component-view-playground.component'

type PlaygroundKey = 'component-view' | 'button'
type ViewKey = 'sandbox' | 'logs'

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [
		EventLogComponent,
		ButtonPlaygroundComponent,
		ComponentViewPlaygroundComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="pg-app">
			<div class="pg-app__nav">
				<button
					class="pg-app__nav-btn"
					[class.pg-app__nav-btn--active]="activeView === 'sandbox'"
					(click)="activeView = 'sandbox'"
				>
					Sandbox
				</button>
				<button
					class="pg-app__nav-btn"
					[class.pg-app__nav-btn--active]="activeView === 'logs'"
					(click)="activeView = 'logs'"
				>
					Logs ({{ logCount }})
				</button>
			</div>

			<div class="pg-app__layout">
				<aside class="pg-app__sidebar">
					<h3 class="pg-app__sidebar-title">Components</h3>
					<nav class="pg-app__menu">
						@for (pg of playgrounds; track pg.key) {
							<button
								class="pg-app__menu-item"
								[class.pg-app__menu-item--active]="active === pg.key"
								(click)="active = pg.key"
							>
								{{ pg.label }}
							</button>
						}
					</nav>
				</aside>

				<main class="pg-app__main">
					<div class="pg-app__content">
						@if (activeView === 'sandbox') {
							<div class="pg-app__container">
								@switch (active) {
									@case ('component-view') {
										<demo-component-view-playground />
									}
									@case ('button') {
										<demo-button-playground />
									}
								}
							</div>
						} @else {
							<div class="pg-app__logs">
								<demo-event-log />
							</div>
						}
					</div>
				</main>
			</div>
		</div>
	`,
})
export class AppComponent {
	protected active: PlaygroundKey = 'component-view'
	protected activeView: ViewKey = 'sandbox'
	protected logCount = 0

	protected readonly playgrounds: Array<{ key: PlaygroundKey; label: string }> = [
		{ key: 'component-view', label: 'ComponentView' },
		{ key: 'button', label: 'Button' },
	]

	private readonly logService = inject(EventLogService)

	constructor() {
		this.logService.events$.subscribe((events) => {
			this.logCount = events.length
		})
	}
}
