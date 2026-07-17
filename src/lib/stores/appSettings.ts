import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    enabledSourcebooks: string[];
    characterDefaults: {
        buildMethod: 'BP' | 'Karma';
        startingBP: number;
        startingKarma: number;
        maxAvailability: number;
    };
}

const DEFAULT_SETTINGS: AppSettings = {
    theme: 'system',
    enabledSourcebooks: ['SR4', 'SR4A'],
    characterDefaults: {
        buildMethod: 'BP',
        startingBP: 400,
        startingKarma: 750,
        maxAvailability: 12
    }
};

let initialSettings = DEFAULT_SETTINGS;

if (browser) {
    const stored = localStorage.getItem('chummer-web-settings');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            initialSettings = {
                ...DEFAULT_SETTINGS,
                ...parsed,
                characterDefaults: {
                    ...DEFAULT_SETTINGS.characterDefaults,
                    ...(parsed.characterDefaults || {})
                }
            };
        } catch (e) {
            console.error('Failed to parse settings', e);
        }
    }
}

export const appSettings = writable<AppSettings>(initialSettings);

if (browser) {
    appSettings.subscribe((value) => {
        localStorage.setItem('chummer-web-settings', JSON.stringify(value));
    });
}
