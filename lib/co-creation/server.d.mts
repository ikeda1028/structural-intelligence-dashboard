type Options = { fetcher?: typeof fetch; env?: NodeJS.ProcessEnv };
export function getPublicData(request: Request | null, options?: Options): Promise<Response>;
export function runResearch(request: Request, options?: Options): Promise<Response>;
