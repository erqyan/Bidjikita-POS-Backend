// Seeder script — generates dummy transactions from June 1 to July 31, 2026
// First resets stock levels so orders don't fail

const BASE = 'https://bidjikita-pos-api-production-2740.up.railway.app/api';

async function main() {
  console.log('Logging in...');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  if (!loginRes.ok) throw new Error('Login failed: ' + (await loginRes.text()));
  const { token } = await loginRes.json();
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  console.log('Logged in');

  // Step 1: Fetch products
  const prodRes = await fetch(`${BASE}/products`, { headers: { Authorization: `Bearer ${token}` } });
  const products = await prodRes.json();
  if (products.length === 0) throw new Error('No products found');

  const items = [];
  for (const p of products) {
    const vars = p.ProductVariants || p.variants || [];
    if (vars.length > 0) {
      for (const v of vars) items.push({ product_id: p.id, variant_ids: [v.id], price: Number(v.price) });
    } else {
      items.push({ product_id: p.id, variant_ids: [], price: 15000 });
    }
  }
  console.log(`Found ${items.length} items`);

  // Step 2: Restock raw materials so orders don't fail
  console.log('Restocking raw materials...');
  const matRes = await fetch(`${BASE}/raw-materials`, { headers: { Authorization: `Bearer ${token}` } });
  const materials = await matRes.json();
  for (const m of materials) {
    const newStock = Math.max(Number(m.stock), 50000);
    await fetch(`${BASE}/raw-materials/${m.id}`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({
        material_name: m.material_name,
        unit: m.unit,
        stock: newStock,
        minimum_stock: Number(m.minimum_stock),
        cost_per_unit: Number(m.cost_per_unit),
      }),
    });
  }
  console.log(`Restocked ${materials.length} materials`);

  // Step 3: Generate orders with transactions
  const startDate = new Date('2026-06-01T08:00:00Z');
  const endDate = new Date('2026-07-19T22:00:00Z');
  const payMethods = ['cash', 'qris'];
  let total = 0, rev = 0, failed = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const n = 8 + Math.floor(Math.random() * 8);
    for (let o = 0; o < n; o++) {
      const hour = 8 + Math.floor(Math.random() * 13);
      const orderDate = new Date(d);
      orderDate.setUTCHours(hour, Math.floor(Math.random() * 60), 0, 0);
      const orderItems = [];
      let orderTotal = 0;
      const num = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < num; i++) {
        const item = items[Math.floor(Math.random() * items.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        orderTotal += item.price * qty;
        orderItems.push({ product_id: item.product_id, quantity: qty, variant_ids: item.variant_ids });
      }

      const orRes = await fetch(`${BASE}/orders`, { method: 'POST', headers: auth, body: JSON.stringify({ notes: '', items: orderItems, created_at: orderDate.toISOString() }) });
      const or = await orRes.json();
      if (!or || !or.id) { failed++; continue; }

      await fetch(`${BASE}/transactions`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          order_id: or.id,
          total_amount: orderTotal,
          payment_method: payMethods[Math.floor(Math.random() * 2)],
          payment_status: 'paid',
          transaction_date: orderDate.toISOString(),
          notes: '',
        }),
      });

      total++;
      rev += orderTotal;
    }
    process.stdout.write(`\r${d.toISOString().slice(0, 10)} — ${n} orders`);
  }

  console.log('\n----------------------------');
  console.log(`Orders created: ${total}`);
  console.log(`Failed:         ${failed}`);
  console.log(`Revenue:        Rp ${rev.toLocaleString('id-ID')}`);
  console.log('----------------------------');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
