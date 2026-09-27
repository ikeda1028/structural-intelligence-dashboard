import styles from './brand-network.module.css';

// The TLA identity's Fibonacci-sphere motif, rendered deterministically as SVG.
// This is a conceptual illustration, not a visualization of actual partnerships.
const points = Array.from({length:156}, (_, i) => {
  const y = 1 - i / 155 * 2;
  const radius = Math.sqrt(1 - y * y);
  const theta = i * Math.PI * (3 - Math.sqrt(5));
  const x = Math.cos(theta) * radius, z = Math.sin(theta) * radius;
  const perspective = 2.8 / (2.8 - z * .35);
  return {x,y,z,px:335+x*173*perspective,py:235+y*166*perspective,opacity:.24+(z+1)*.34};
});
const edges:[number,number][] = [];
points.forEach((p,i) => {
  points.map((q,j) => ({j,d:(p.x-q.x)**2+(p.y-q.y)**2+(p.z-q.z)**2}))
    .filter(q=>q.j!==i).sort((a,b)=>a.d-b.d).slice(0,4)
    .forEach(({j})=>{if(j>i)edges.push([i,j]);});
});

export default function BrandNetwork() {
  return <div className={styles.scene} role="img" aria-label="概念図：ひとつの問いから地域の資料と企業のリソースがつながり、共創の仮説が広がる。実際の契約や提携関係を示すものではありません。">
    <p className={styles.coordinate}>A QUESTION OPENS A WORLD.</p>
    <svg viewBox="0 0 580 460" fill="none" aria-hidden="true">
      <g stroke="currentColor">
        <ellipse cx="335" cy="235" rx="204" ry="148" transform="rotate(-26 335 235)" opacity=".13"/>
        <ellipse cx="335" cy="235" rx="203" ry="170" transform="rotate(28 335 235)" opacity=".1"/>
        {edges.map(([a,b])=><path key={`${a}-${b}`} d={`M${points[a].px} ${points[a].py}L${points[b].px} ${points[b].py}`} strokeWidth=".75" opacity={Math.min(points[a].opacity,points[b].opacity)*.3}/>)}
        {[36,71,112].map(i=><path key={i} d={`M64 250C165 250 ${points[i].px-60} ${points[i].py} ${points[i].px} ${points[i].py}`} opacity=".55" strokeWidth="1"/>)}
      </g>
      <g fill="currentColor">{points.map((p,i)=><g key={i} opacity={p.opacity}>{i%13===0&&<circle cx={p.px} cy={p.py} r="8" opacity=".08"/>}<circle cx={p.px} cy={p.py} r={i%13===0?2.8:1.35}/></g>)}</g>
      <circle cx="64" cy="250" r="42" fill="currentColor" opacity=".025"/>
      <circle cx="64" cy="250" r="35" fill="currentColor" opacity=".04"/>
      <circle cx="64" cy="250" r="28" className={styles.origin}/>
      <text x="64" y="259" textAnchor="middle" fill="currentColor" className={styles.question}>Q_</text>
    </svg>
    <span className={`${styles.label} ${styles.region}`}><i/>地域の資料<small>LOCAL KNOWLEDGE</small></span>
    <span className={`${styles.label} ${styles.resources}`}><i/>企業のリソース<small>RESOURCES</small></span>
    <span className={`${styles.label} ${styles.possibility}`}><i/>共創の仮説<small>POSSIBILITIES</small></span>
    <p className={styles.caption}>ひとつの問いから、可能性はひらく。<span>CONCEPTUAL VIEW / 概念図</span></p>
  </div>;
}
