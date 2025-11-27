/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			userId?: string;
		}
		interface PageData {
			title?: string;
		}
		interface PageState {}
		interface Platform {}
	}
}

export {};
