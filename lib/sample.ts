import type { Artifact, TransactionFact } from './types';
import { buildDynamicRecommendations, detectRevenueAnomalies } from './intelligence.ts';

function rng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function buildSampleArtifact(): Artifact {
  const random = rng(20260820);
  const products = [
    ['Slate Standing Desk','Office',520,345],['Orbit Chair','Office',390,255],['Pulse ANC Headset','Electronics',220,130],['Vector Desk Hub','Electronics',150,88],
    ['Loft Air Purifier','Home',280,166],['Core Smart Scale','Fitness',105,57],['Nimbus Webcam','Electronics',90,47],['Apex Laptop Stand','Office',72,31],
  ] as const;
  const regions = ['West','North','South','East']; const channels = ['Online','Retail','Distributor']; const segments = ['Consumer','SMB','Mid-Market','Enterprise'];
  const records: TransactionFact[] = []; let id = 0;
  for (let monthIndex = 0; monthIndex < 24; monthIndex += 1) {
    const date = new Date(Date.UTC(2024, monthIndex, 1)); const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;
    const seasonal = 1 + 0.12 * Math.sin((date.getUTCMonth()/12) * Math.PI * 2) + (date.getUTCMonth() === 11 ? .22 : 0);
    for (const [product, category, basePrice, unitCost] of products) {
      for (let line = 0; line < 4; line += 1) {
        id += 1; const region = regions[Math.floor(random()*regions.length)]; const channel = channels[Math.floor(random()*channels.length)]; const segment = segments[Math.floor(random()*segments.length)];
        const quantity = 1 + Math.floor(random()*5); const trend = 1 + monthIndex * (product === 'Core Smart Scale' ? .012 : .004); const list = basePrice * (0.94 + random()*.12); let discountRate = .05 + random()*.1 + (channel === 'Distributor' ? .07 : 0) + (segment === 'Enterprise' ? .04 : 0); discountRate = Math.min(.34, discountRate);
        const grossRevenue = quantity * list * seasonal * trend; const discountAmount = grossRevenue * discountRate; const netRevenue = grossRevenue - discountAmount; const costInflation = 1 + monthIndex*.0025; const cost = quantity * unitCost * costInflation; const grossProfit = netRevenue-cost;
        records.push({ transaction_id:`DEMO-${String(id).padStart(6,'0')}`, order_id:`ORDER-${String(id).padStart(6,'0')}`, order_date:`${month}-${String(2+Math.floor(random()*26)).padStart(2,'0')}`, region, channel, customer_segment:segment, category, product, quantity, gross_revenue:grossRevenue, discount_amount:discountAmount, discount_rate:discountRate, net_revenue:netRevenue, cost, gross_profit:grossProfit, gross_margin:netRevenue ? grossProfit/netRevenue : 0, month });
      }
    }
  }
  const sum = (key: keyof Pick<TransactionFact,'net_revenue'|'gross_revenue'|'gross_profit'|'discount_amount'|'cost'|'quantity'>) => records.reduce((total,row)=>total+Number(row[key]),0);
  const revenue=sum('net_revenue'), gross=sum('gross_revenue'), profit=sum('gross_profit'), discount=sum('discount_amount'), cost=sum('cost'), units=sum('quantity'), orders=new Set(records.map(r=>r.order_id)).size;
  const unique=(key:keyof TransactionFact)=>Array.from(new Set(records.map(row=>String(row[key])))).sort();
  return {
    metadata:{ schema_version:'3.0.0-demo', build_id:'DEMO-20260820', build_mode:'browser_demo', source_file:'in-browser-sample', source_sha256:'deterministic-browser-demo', row_count:records.length, column_count:17, validation_status:'passed', validation_checks:['deterministic_generation','economic_identity','date_range'], random_seed:20260820, date_min:records.map(r=>r.order_date).sort()[0], date_max:records.map(r=>r.order_date).sort().at(-1) as string },
    filter_options:{ regions:unique('region'), channels:unique('channel'), segments:unique('customer_segment'), categories:unique('category'), products:unique('product') },
    summary:{ net_revenue:revenue,gross_revenue:gross,gross_profit:profit,gross_margin:revenue?profit/revenue:0,discount_amount:discount,discount_rate:gross?discount/gross:0,orders,units,average_order_value:revenue/orders,average_selling_price:revenue/units,cost },
    monthly_performance:[],dimensions:{},combinations:{},pareto:{},discount:{},product_economics:[],anomalies:detectRevenueAnomalies(records),seasonality:{},recommendations:buildDynamicRecommendations(records),
    methodology:{ demo:'Deterministic in-browser sample data is provided only to demonstrate the workflow. Upload your own file for business use.', economics:'Gross profit = net revenue − cost. Discount is modeled as gross-to-net leakage.', anomaly_detection:'Monthly revenue anomalies use MAD robust z-scores with |z| >= 3.0.', forecast:'Forecasts use a lightweight trend model with optional shrunk month-of-year seasonality.', scenarios:'Scenario simulation changes price, discount and cost while holding unit volume constant.' },records,
  };
}
