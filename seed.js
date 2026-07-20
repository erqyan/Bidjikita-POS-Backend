// Seeder script — generates dummy transactions from June 1 to July 31, 2026
// Usage: node seed.js
// Requires a logged-in admin token or DEFAULT_ADMIN_PASSWORD to be set

const BASE = 'https://bidjikita-pos-api-production-2740.up.railway.app/api';

async function main() {
  // ── 1. Login ───────────────────────────────────────────────────────────────
  console.log('Logging in...');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.text();
    throw new Error(`Login failed: ${err}`);
  }
  const { token } = await loginRes.json();
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  console.log('Logged in as admin');

  // ── 2. Fetch existing products with variants ───────────────────────────────
  console.log('Fetching products...');
  const prodRes = await fetch(`${BASE}/products`, { headers: { Authorization: `Bearer ${token}` } });
  const products = await prodRes.json();

  if (products.length === 0) {
    throw new Error('No products found. Create some products first via the dashboard.');
  }

  // Build a list of orderable items: [{ product_id, variant_ids, price }]
  const items = [];
  for (const p of products) {
    const vars = p.ProductVariants || p.variants || [];
    if (vars.length > 0) {
      for (const v of vars) {
        items.push({ product_id: p.id, variant_ids: [v.id], price: Number(v.price) });
      }
    } else {
      items.push({ product_id: p.id, variant_ids: [], price: 15000 });
    }
  }
  console.log(`Found ${items.length} orderable item variants`);

  // ── 3. Generate random orders with transactions ─────────────────────────────
  const startDate = new Date('2026-06-01T08:00:00Z');
  const endDate = new Date('2026-07-31T22:00:00Z');
  const diffMs = endDate.getTime() - startDate.getTime();

  const paymentMethods = ['cash', 'qris'];
  const labels = ['Pembayaran minuman', 'Pesanan reguler', 'Transaksi harian'];

  // Generate about 8-15 orders per day
  let totalOrders = 0;
  let totalRevenue = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const ordersToday = 8 + Math.floor(Math.random() * 8); // 8-15 orders per day

    for (let o = 0; o < ordersToday; o++) {
      // Random time between 08:00 and 21:00
      const hour = 8 + Math.floor(Math.random() * 13);
      const minute = Math.floor(Math.random() * 60);
      const orderDate = new Date(d);
      orderDate.setUTCHours(hour, minute, 0, 0);

      // 1-4 items per order
      const orderItems = [];
      const numItems = 1 + Math.floor(Math.random() * 4);
      let orderTotal = 0;

      for (let i = 0; i < numItems; i++) {
        const item = items[Math.floor(Math.random() * items.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        const subtotal = item.price * qty;
        orderTotal += subtotal;
        orderItems.push({
          product_id: item.product_id,
          quantity: qty,
          variant_ids: item.variant_ids,
        });
      }

      // Create order
      const orderRes = await fetch(`${BASE}/orders`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ notes: '', items: orderItems }),
      });

      if (!orderRes.ok) {
        const errText = await orderRes.text();
        console.warn(`  Order failed at ${orderDate.toISOString()}: ${errText.slice(0, 100)}`);
        continue;
      }

      const order = await orderRes.json();
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const notes = labels[Math.floor(Math.random() * labels.length)];

      // Create transaction
      const txRes = await fetch(`${BASE}/transactions`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          order_id: order.id,
          total_amount: orderTotal,
          payment_method: method,
          payment_status: 'paid',
          transaction_date: orderDate.toISOString(),
          notes,
        }),
      });

      if (!txRes.ok) {
        const errText = await txRes.text();
        console.warn(`  Transaction failed: ${errText.slice(0, 100)}`);
        continue;
      }

      totalOrders++;
      totalRevenue += orderTotal;
    }

    // Progress
    const pct = ((d.getTime() - startDate.getTime()) / diffMs * 100).toFixed(0);
    process.stdout.write(`\r  ${d.toISOString().slice(0, 10)} — ${ordersToday} orders » ${pct}%`);
  }

  console.log('\n');
  console.log('═══════════════════════════════════════');
  console.log(`  Total orders:     ${totalOrders}`);
  console.log(`  Total revenue:    Rp ${totalRevenue.toLocaleString('id-ID')}`);
  console.log(`  Period:           June 1 – July 31, 2026`);
  console.log(`  Avg per day:      ${(totalOrders / 61).toFixed(1)} orders`);
  console.log('═══════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
