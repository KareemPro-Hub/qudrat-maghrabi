import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const compiled=ts.transpileModule(await readFile('server/owner-payment-email.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const {buildOwnerPaymentMessage,processOwnerPaymentEmail,OWNER_PAYMENT_RECIPIENT}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
const id='11111111-1111-4111-8111-111111111111',token='22222222-2222-4222-8222-222222222222'
const base={id,event_key:'paymob:synthetic-test',source:'paymob',student_name:'طالب اختبار',student_email:'qa@example.test',course_name:'كورس اختبار',amount_minor:25745,currency:'EGP',paid_at:'2026-10-21T12:00:00Z',status:'pending',attempts:0,provider_email_id:null,is_test:false}
function fixture(options={}){
 const row={...base,...options.row}; const calls=[]
 const dependencies={
  async find(i,t){calls.push('find');return i===id&&t===token?{...row}:null},
  async claim(){calls.push('claim');if(options.locked||row.status==='processing')return null;row.status='processing';return {...row}},
  async send(value){calls.push(['send',value.id]);if(options.sendFails)throw Error('private provider details');return 'provider-test-id'},
  async markSent(){calls.push('sent');if(options.ackFails)throw Error('private database details');row.status='sent';row.provider_email_id='provider-test-id'},
  async markFailed(){calls.push('retry');row.status='pending'},
  async delivery(){calls.push('delivery');return options.deliveryEvent ?? 'delivered'},
  async markDelivery(i,event){calls.push(['delivery_saved',i,event])},
 };return {row,calls,dependencies}
}
const input={notification_id:id,token}
test('recipient is exactly the user-approved address',()=>{assert.equal(OWNER_PAYMENT_RECIPIENT,'mr.ali.maths1@gmail.com');assert.deepEqual(buildOwnerPaymentMessage(base).to,[OWNER_PAYMENT_RECIPIENT])})
test('arbitrary recipient and payload overrides cannot change message routing or content',async()=>{const f=fixture();await processOwnerPaymentEmail({...input,to:'attacker@example.test',amount:1,student_name:'forged'},f.dependencies);assert.deepEqual(f.calls.find(x=>Array.isArray(x)&&x[0]==='send'),['send',id]);assert.equal(f.row.student_name,base.student_name)})
test('invalid requests never load or send notifications',async()=>{for(const body of [null,{}, {notification_id:'bad',token},{notification_id:id,token:'bad'}]){const f=fixture();assert.equal((await processOwnerPaymentEmail(body,f.dependencies)).status,401);assert.deepEqual(f.calls,[])}})
test('unknown or guessed token cannot send',async()=>{const f=fixture();assert.equal((await processOwnerPaymentEmail({...input,token:'33333333-3333-4333-8333-333333333333'},f.dependencies)).status,401);assert.deepEqual(f.calls,['find'])})
test('successful send is acknowledged and returns no private payment data',async()=>{const f=fixture();const response=await processOwnerPaymentEmail(input,f.dependencies);assert.deepEqual(response,{status:200,body:{state:'sent'}});assert.equal(f.row.status,'sent')})
test('replaying an already sent notification does not send twice',async()=>{const f=fixture();await processOwnerPaymentEmail(input,f.dependencies);const second=await processOwnerPaymentEmail(input,f.dependencies);assert.equal(second.body.duplicate,true);assert.equal(f.calls.filter(x=>Array.isArray(x)&&x[0]==='send').length,1)})
test('active lease prevents concurrent sends',async()=>{const f=fixture({locked:true});assert.equal((await processOwnerPaymentEmail(input,f.dependencies)).body.state,'not_due');assert.equal(f.calls.some(x=>Array.isArray(x)&&x[0]==='send'),false)})
test('provider failure remains retryable without exposing error text',async()=>{const f=fixture({sendFails:true});const response=await processOwnerPaymentEmail(input,f.dependencies);assert.equal(response.status,502);assert.equal(f.row.status,'pending');assert.equal(JSON.stringify(response).includes('private'),false);assert.ok(f.calls.includes('retry'))})
test('lost database acknowledgement remains retryable with same notification ID',async()=>{const f=fixture({ackFails:true});assert.equal((await processOwnerPaymentEmail(input,f.dependencies)).body.state,'retry_pending');assert.ok(f.calls.includes('retry'))})
test('delivery status never sends another email',async()=>{const f=fixture({row:{status:'sent',provider_email_id:'provider-test-id'}});assert.deepEqual((await processOwnerPaymentEmail({...input,action:'status'},f.dependencies)).body,{state:'sent',delivery:'delivered'});assert.equal(f.calls.some(x=>Array.isArray(x)&&x[0]==='send'),false)})
test('invalid actions are rejected without sending',async()=>{const f=fixture();assert.equal((await processOwnerPaymentEmail({...input,action:'arbitrary'},f.dependencies)).status,400);assert.equal(f.calls.length,1)})
test('HTML escapes student and course data',()=>{const message=buildOwnerPaymentMessage({...base,student_name:'<script>alert(1)</script>',course_name:'<img src=x onerror=alert(1)>'});assert.equal(message.html.includes('<script>'),false);assert.equal(message.html.includes('<img src=x'),false);assert.ok(message.html.includes('&lt;script&gt;'))})
test('gateway amount uses actual processing currency without claiming it is SAR',()=>{const message=buildOwnerPaymentMessage(base);assert.ok(message.text.includes('257.45 EGP'));assert.equal(message.text.includes('257.45 SAR'),false)})
for(const source of ['apple','google'])test(`${source} does not invent a store charge amount`,()=>{const message=buildOwnerPaymentMessage({...base,source,amount_minor:null,currency:null});assert.ok(message.text.includes('المبلغ غير متاح'));assert.equal(message.text.includes('257.45'),false)})
test('test email is clearly labelled and cannot be mistaken for a real charge',()=>{const message=buildOwnerPaymentMessage({...base,is_test:true});assert.ok(message.subject.startsWith('اختبار'));assert.ok(message.text.includes('لم يتم خصم أو تسجيل أي دفعة حقيقية'))})

test('delivery status permission failure is explicit without sending another email',async()=>{const f=fixture({row:{status:'sent',provider_email_id:'provider-test-id'},deliveryEvent:'status_http_403'});const response=await processOwnerPaymentEmail({...input,action:'status'},f.dependencies);assert.equal(response.body.delivery,'status_http_403');assert.equal(f.calls.some(x=>Array.isArray(x)&&x[0]==='send'),false)})
