import { provideBrowserGlobalErrorListeners } from '@angular/core'
import type { ApplicationConfig } from '@angular/core'
import { provideAttrs } from '@soldy-ui/angular'

export const appConfig: ApplicationConfig = {
	providers: [provideBrowserGlobalErrorListeners(), provideAttrs()],
}
