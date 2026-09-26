/**
 * Create a deal on one server and read it from another.
 * Same URL twice still crosses Vercel instances. Two ports cross local processes.
 *
 *   node scripts/cross-instance.mjs https://honest-cart-lyart.vercel.app
 *   node scripts/cross-instance.mjs http://127.0.0.1:43123 http://127.0.0.1:43124
 */
const writerBase = (process.argv[2] || 'http://127.0.0.1:43123').replace(/\/$/, '');
const readerBase = (process.argv[3] || writerBase).replace(/\/$/, '');

async function negotiate() {
  const response = await fetch(`${writerBase}/api/negotiate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      productName: 'Sony WH-1000XM6',
      cheaperSeller: 'Techinthebasket',
      cheaperPrice: 244.99,
      cheaperFlags: ['grey_import'],
      trustedSeller: 'Currys',
      trustedPrice: 349,
    }),
  });
  if (!response.ok) throw new Error(`negotiate ${response.status}`);
  const text = await response.text();
  const complete = text.split('\n').filter((line) => line.includes('"type":"complete"')).pop();
  if (!complete) {
    console.error(text.slice(-500));
    throw new Error('negotiate did not complete');
  }
  return JSON.parse(complete.replace(/^data:\s*/, ''));
}

async function getJson(base, path) {
  const response = await fetch(`${base}${path}`, { cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, cache: response.headers.get('cache-control'), body };
}

async function main() {
  const created = await negotiate();
  console.log('created', { dealId: created.dealId, approvalId: created.approvalId, readerBase });

  let dealOk = 0;
  let approvalOk = 0;
  for (let i = 0; i < 6; i++) {
    const deal = await getJson(readerBase, `/api/deals/${created.dealId}`);
    const approval = await getJson(readerBase, `/api/approvals/${created.approvalId}`);
    console.log(i, 'deal', deal.status, deal.cache, 'approval', approval.status, approval.body.status || approval.body.error);
    if (deal.status === 200) dealOk += 1;
    if (approval.status === 200) approvalOk += 1;
  }

  if (dealOk !== 6 || approvalOk !== 6) {
    console.error('FAIL: reader did not see the deal on every request. Writes are still instance memory.');
    process.exit(1);
  }

  const approved = await fetch(`${readerBase}/api/approvals/${created.approvalId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ approved: true }),
  });
  const approvedBody = await approved.json();
  console.log('approve', approved.status, approvedBody.checkoutUrl ? 'stripe' : 'simulated');
  if (!approved.ok) {
    console.error('FAIL: approve did not persist', approvedBody);
    process.exit(1);
  }

  let sawApproved = 0;
  for (let i = 0; i < 6; i++) {
    const approval = await getJson(writerBase, `/api/approvals/${created.approvalId}`);
    console.log('after', i, approval.status, approval.body.status, approval.body.stripe_payment_status || '');
    if (approval.body.status === 'approved') sawApproved += 1;
  }
  if (sawApproved !== 6) {
    console.error('FAIL: approval status did not read back as approved from the other server.');
    process.exit(1);
  }

  const bogus = await fetch(
    `${readerBase}/receipt/${created.approvalId}?session_id=cs_test_not_a_real_session`,
    { redirect: 'manual' }
  );
  console.log('bogus receipt', bogus.status);
  const still = await getJson(writerBase, `/api/approvals/${created.approvalId}`);
  if (still.body.stripe_payment_status === 'paid') {
    console.error('FAIL: an unverified session was stored as paid');
    process.exit(1);
  }
  console.log('PASS: deal and approval are visible across requests, and a fake session is not paid.');
  if (approvedBody.checkoutUrl) {
    console.log('STRIPE_CHECKOUT', approvedBody.checkoutUrl);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
