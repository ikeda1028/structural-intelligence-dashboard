// Read-only index of existing cached official documents, for human review.
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('..',import.meta.url).pathname;
const files=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.txt'))files.push(p);}}
walk(join(root,'work'));
const research=JSON.parse(readFileSync(join(root,'public/co-creation-assets/major100-research.json')));
const cohort=JSON.parse(readFileSync(join(root,'public/co-creation-assets/major-municipalities-100.json')));
const from=Number(process.argv[2]||1),to=Number(process.argv[3]||100);
const codes=new Set(cohort.municipalities.filter(c=>c.rank>=from&&c.rank<=to).map(c=>c.code));
for(const [code,city]of Object.entries(research.municipalities))for(const doc of city.documents){
 if(!codes.has(code))continue;
 const hash=createHash('sha256').update(doc.source_url).digest('hex').slice(0,12);
 const paths=files.filter(p=>p.endsWith('/'+hash+'.txt'));
 const record={code,city:city.name,document_id:doc.id,url:doc.source_url,paths};
 if(process.argv.includes('--hits')){
  const lines=paths.length?readFileSync(paths[0],'utf8').split('\n'):[];
  record.hits=lines.flatMap((s,i)=>/株式会社|合同会社|（株）|\(株\)|受託者名|委託先|提供事業者|構築事業者|Microsoft|GMO|NTT|サイボウズ|クラウドサイン|exaBase|Bot Express|AVILEN|NEC|コード・フォー/.test(s)&&!/Adobe|アドビ/.test(s)?[{line:i+1,text:lines.slice(Math.max(0,i-1),i+3).join(' ')}]:[]);
 }
 console.log(JSON.stringify(record));
}
