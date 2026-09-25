import {getBundledPublicData} from '../../../lib/co-creation/public-data.mjs';
import {runResearch} from '../../../lib/co-creation/server.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(){return getBundledPublicData();}
export async function POST(request:Request){return runResearch(request);}
