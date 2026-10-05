const fs = require('fs');
const path = 'data/orders.json';
const orders = JSON.parse(fs.readFileSync(path, 'utf8'));

orders.forEach(order => {
  const cust = (order.customer || '').toLowerCase();
  const kiosk = (order.kioskId || '').toUpperCase();
  const loc = (order.location || '').toLowerCase();

  let dev = 'Mobile';
  if (cust.includes('mobile') || kiosk.includes('MOBILE') || /^[A-Z0-9]{6}$/.test(kiosk)) {
    dev = 'Mobile';
  } else if (kiosk.startsWith('T-') || loc.includes('table')) {
    dev = 'Tablet';
  } else if (kiosk.startsWith('K-') || kiosk === 'COUNTER' || loc.includes('kiosk')) {
    dev = 'Desktop';
  }

  order.device = dev;
  order.platform = dev;
});

fs.writeFileSync(path, JSON.stringify(orders, null, 2), 'utf8');
console.log('Successfully updated data/orders.json with device tags:');
orders.forEach(o => console.log(o.orderId, '=>', o.device, '|', o.customer, '|', o.kioskId));
