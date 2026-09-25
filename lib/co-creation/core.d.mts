export function normalize(value: unknown): string;
export function safeUrl(value: unknown): string | null;
export function lookup(seed: any, name: string): any[];
export function parseGsi(text: string): any[];
export function match(seed: any, company: any, municipalities: any[]): any[];
export function validateInput(body: unknown): {name:string;officialUrl:string};
export function parseResearch(response: any, seed: any, input: any): any;
