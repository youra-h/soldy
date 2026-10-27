import { provideZonelessChangeDetection } from '@angular/core'
import {
	bootstrapApplication,
	provideClientHydration,
	type BootstrapContext,
} from '@angular/platform-browser'
import { provideServerRendering, renderApplication } from '@angular/platform-server'
import { provideAttrs } from '@soldy-ui/angular'
import { PREVIEWS } from '../../../packages/playground/vue/src/hosts/angular/previews'
import { PAGE, PageComponent } from './angular/page.component'
import { measure } from './measure'

/**
 * The Angular page: an application per request (`renderApplication`), as a
 * server renders one — its own server platform, hydration annotations,
 * zoneless, the adapter's renderer (`provideAttrs()`), as in an
 * application's `appConfig`. The request's language and components come as a
 * provider of the request.
 */
await measure(
	{
		framework: 'angular',
		render(locale, components) {
			return renderApplication(
				(context: BootstrapContext) =>
					bootstrapApplication(
						PageComponent,
						{
							providers: [
								provideServerRendering(),
								provideClientHydration(),
								provideZonelessChangeDetection(),
								provideAttrs(),
								{ provide: PAGE, useValue: { locale, components } },
							],
						},
						context,
					),
				{ document: '<html><head></head><body><bench-page></bench-page></body></html>' },
			)
		},
	},
	Object.keys(PREVIEWS),
)
