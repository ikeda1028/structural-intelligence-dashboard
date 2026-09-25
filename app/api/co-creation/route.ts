import {getPublicData, runResearch} from '../../../lib/co-creation/server.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request): Promise<Response> { return getPublicData(request); }
export async function POST(request: Request): Promise<Response> { return runResearch(request); }
