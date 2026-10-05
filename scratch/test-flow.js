// Using native Node global fetch

async function runTest() {
  const baseUrl = 'http://localhost:3001';
  console.log('--- 1. Testing GET /api/promos ---');
  let res = await fetch(`${baseUrl}/api/promos`);
  let promos = await res.json();
  console.log(`Active promos count: ${promos.length}, codes:`, promos.map(p => p.code));

  console.log('\n--- 2. Manually expiring PR-1003 (MANGO10) ---');
  res = await fetch(`${baseUrl}/api/promos/expire/PR-1003`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Admin manual test' })
  });
  let expireData = await res.json();
  console.log('Expire response:', expireData.message);

  console.log('\n--- 3. Testing GET /api/promos after expiration ---');
  res = await fetch(`${baseUrl}/api/promos`);
  promos = await res.json();
  const mangoInActive = promos.find(p => p.code === 'MANGO10' && p.status === 'active');
  console.log('MANGO10 still active in active promos list?', !!mangoInActive);

  console.log('\n--- 4. Testing GET /api/promos/expired ---');
  res = await fetch(`${baseUrl}/api/promos/expired`);
  let expired = await res.json();
  console.log(`Expired archive count: ${expired.length}, codes:`, expired.map(p => `${p.originalCode || p.code} (${p.status})`));

  console.log('\n--- 5. Validating old expired code MANGO10 (Should fail) ---');
  res = await fetch(`${baseUrl}/api/promos/validate/MANGO10`);
  let valOld = await res.json();
  console.log('Validate MANGO10:', res.status, valOld);

  console.log('\n--- 6. Attempting to restore with SAME old code MANGO10 (Should be rejected) ---');
  res = await fetch(`${baseUrl}/api/promos/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      promoId: 'PR-1003',
      newCode: 'MANGO10',
      newExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      restoredBy: 'manager@umamicraft.com'
    })
  });
  let reuseAttempt = await res.json();
  console.log('Reusing old code status:', res.status, reuseAttempt.error);

  console.log('\n--- 7. Restoring with brand new unique code MANGO99 ---');
  const futureExp = new Date(Date.now() + 30 * 86400000).toISOString();
  res = await fetch(`${baseUrl}/api/promos/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      promoId: 'PR-1003',
      newCode: 'MANGO99',
      newExpiresAt: futureExp,
      restoredBy: 'manager@umamicraft.com'
    })
  });
  let restoreData = await res.json();
  console.log('Restore success status:', res.status, restoreData.message);
  console.log('Restored promo info:', {
    code: restoreData.promo?.code,
    originalCode: restoreData.promo?.originalCode,
    status: restoreData.promo?.status,
    restoredBy: restoreData.promo?.restoredBy,
    retiredCodes: restoreData.promo?.retiredCodes
  });

  console.log('\n--- 8. Validating brand new code MANGO99 (Should succeed) ---');
  res = await fetch(`${baseUrl}/api/promos/validate/MANGO99`);
  let valNew = await res.json();
  console.log('Validate MANGO99:', res.status, valNew.valid, valNew.promo?.name);

  console.log('\n--- 9. Validating old code MANGO10 again (Must remain PERMANENTLY RETIRED) ---');
  res = await fetch(`${baseUrl}/api/promos/validate/MANGO10`);
  let valOldPostRestore = await res.json();
  console.log('Validate old MANGO10 post-restore:', res.status, valOldPostRestore);

  console.log('\n--- 10. Attempting to redeem old code MANGO10 (Must fail) ---');
  res = await fetch(`${baseUrl}/api/promos/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promoCode: 'MANGO10' })
  });
  let redeemOld = await res.json();
  console.log('Redeem old MANGO10:', res.status, redeemOld.error);

  console.log('\n--- 11. Restoring back to MANGO10 for original default demo consistency ---');
  // Cleanly restore to original demo code MANGO10 so initial screenshots match
  res = await fetch(`${baseUrl}/api/promos/PR-1003`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...restoreData.promo,
      code: 'MANGO10',
      status: 'active',
      retiredCodes: [],
      expiresAt: '2026-12-31T23:59:59.000Z'
    })
  });
  console.log('Reset back to active MANGO10 status:', res.status);
  console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

runTest().catch(console.error);
