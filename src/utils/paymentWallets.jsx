import React from 'react';

/**
 * Official E-Wallet & Digital Banking Providers for Umami Craft Fusion
 */
export const SUPPORTED_EWALLETS = [
  {
    id: 'GCash',
    name: 'GCash',
    shortName: 'GCash',
    brandColor: '#007DFE',
    badge: 'Popular',
    accountName: 'UMAMI CRAFT FUSION INC.',
    accountNumber: '0917-888-UMAMI (86264)',
    qrCodeMock: 'gcash_qr_ph_umami.png',
    placeholder: 'Enter 13-digit GCash Ref # (e.g. 1002938475812)',
    description: 'Instant payment via GCash App / QR Ph scan'
  },
  {
    id: 'Maya',
    name: 'Maya',
    shortName: 'Maya',
    brandColor: '#00D665',
    badge: 'QR Ph',
    accountName: 'UMAMI CRAFT FUSION INC.',
    accountNumber: '0918-999-UMAMI (86264)',
    qrCodeMock: 'maya_qr_ph_umami.png',
    placeholder: 'Enter 12-digit Maya Reference #',
    description: 'Pay via Maya Wallet or QR Ph mobile app'
  },
  {
    id: 'PayPal',
    name: 'PayPal',
    shortName: 'PayPal',
    brandColor: '#003087',
    badge: 'Global',
    accountName: 'Umami Craft Fusion PH',
    accountNumber: 'payments@umamicraft.com',
    qrCodeMock: 'paypal_qr_umami.png',
    placeholder: 'Enter PayPal Transaction ID (e.g. 9AB82710)',
    description: 'International wallet & linked credit/debit cards'
  },
  {
    id: 'MariBank',
    name: 'MariBank',
    shortName: 'MariBank',
    brandColor: '#FF5722',
    badge: 'Digital Bank',
    accountName: 'UMAMI CRAFT FUSION INC.',
    accountNumber: '1088-2938-4821',
    qrCodeMock: 'maribank_qr_umami.png',
    placeholder: 'Enter 12-digit MariBank Reference #',
    description: 'Instant digital bank transfer via Sea / MariBank'
  },
  {
    id: 'GrabPay',
    name: 'GrabPay',
    shortName: 'GrabPay',
    brandColor: '#00B14F',
    badge: 'Grab Rewards',
    accountName: 'UMAMI CRAFT FUSION',
    accountNumber: '0917-888-8626',
    qrCodeMock: 'grabpay_qr_umami.png',
    placeholder: 'Enter 10-digit GrabPay Transaction ID',
    description: 'Fast e-wallet checkout & earn GrabRewards points'
  },
  {
    id: 'ShopeePay',
    name: 'ShopeePay',
    shortName: 'ShopeePay',
    brandColor: '#EE4D2D',
    badge: 'Shopee App',
    accountName: 'UMAMI CRAFT FUSION',
    accountNumber: '0919-777-8626',
    qrCodeMock: 'shopeepay_qr_umami.png',
    placeholder: 'Enter 12-digit ShopeePay Reference #',
    description: 'Direct checkout via ShopeePay wallet'
  },
  {
    id: 'GoTyme Bank',
    name: 'GoTyme Bank',
    shortName: 'GoTyme',
    brandColor: '#00C2A0',
    badge: 'Go Rewards',
    accountName: 'UMAMI CRAFT FUSION INC.',
    accountNumber: '0192-3849-1029',
    qrCodeMock: 'gotyme_qr_umami.png',
    placeholder: 'Enter GoTyme Bank Reference # (e.g. GT-8291)',
    description: 'Free instant transfer & Go Rewards earning'
  }
];

/**
 * High-definition Vector Logos for supported E-Wallets
 */
export function EWalletLogo({ id, size = 20, style = {} }) {
  const s = size;
  const key = String(id || '').toLowerCase().trim();

  if (key === 'gcash') {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" style={{ borderRadius: '6px', flexShrink: 0, ...style }}>
        <rect width="32" height="32" rx="7" fill="#007DFE" />
        <path d="M16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26C20.65 26 24.56 22.82 25.64 18.5H16.2V14.2H25.96C25.98 14.8 26 15.4 26 16C26 21.523 21.523 26 16 26" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="16" cy="16" r="3.2" fill="#FFFFFF" />
      </svg>
    );
  }

  if (key === 'maya') {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" style={{ borderRadius: '6px', flexShrink: 0, ...style }}>
        <rect width="32" height="32" rx="7" fill="#059669" />
        <path d="M7 21V11L12.5 17L18 11V21" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="23.5" cy="18" r="2.5" fill="#34D399" />
      </svg>
    );
  }

  if (key === 'paypal') {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" style={{ borderRadius: '6px', flexShrink: 0, ...style }}>
        <rect width="32" height="32" rx="7" fill="#003087" />
        <path d="M11 7H17.2C19.8 7 21.6 8.5 21.1 11.4C20.6 14.1 18.3 15.6 15.8 15.6H13.2L12 23H8.5L11 7Z" fill="#0079C1" />
        <path d="M13.8 11.2H19C21.2 11.2 22.8 12.5 22.3 14.9C21.8 17.3 19.8 18.7 17.5 18.7H15.2L14.2 25H11.5L13.8 11.2Z" fill="#00457C" fillOpacity="0.9" />
      </svg>
    );
  }

  if (key === 'maribank') {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" style={{ borderRadius: '6px', flexShrink: 0, ...style }}>
        <rect width="32" height="32" rx="7" fill="#FF5722" />
        <path d="M8 22V10L16 17.5L24 10V22" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="16" cy="11" r="2" fill="#FFE0B2" />
      </svg>
    );
  }

  if (key === 'grabpay' || key === 'grab') {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" style={{ borderRadius: '6px', flexShrink: 0, ...style }}>
        <rect width="32" height="32" rx="7" fill="#00B14F" />
        <path d="M16 8C11.58 8 8 11.58 8 16C8 20.42 11.58 24 16 24C19.5 24 22.45 21.75 23.55 18.5H16.5V14.5H23.95C23.98 15 24 15.5 24 16C24 20.42 20.42 24 16 24" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round"/>
        <circle cx="16" cy="16" r="2.8" fill="#A7F3D0" />
      </svg>
    );
  }

  if (key === 'shopeepay' || key === 'shopee') {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" style={{ borderRadius: '6px', flexShrink: 0, ...style }}>
        <rect width="32" height="32" rx="7" fill="#EE4D2D" />
        <path d="M12 11C12 8.79 13.79 7 16 7C18.21 7 20 8.79 20 11" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round"/>
        <rect x="8" y="11" width="16" height="14" rx="3" fill="#FFFFFF"/>
        <path d="M18 15C17.5 14.4 16.8 14 16 14C14.9 14 14 14.7 14 15.6C14 17.5 18 17.2 18 19.5C18 20.6 17.1 21.5 15.8 21.5C14.7 21.5 13.9 21 13.4 20.3" stroke="#EE4D2D" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }

  if (key === 'gotyme' || key === 'gotyme bank') {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" style={{ borderRadius: '6px', flexShrink: 0, ...style }}>
        <rect width="32" height="32" rx="7" fill="#0B3C49" />
        <circle cx="12" cy="16" r="5" stroke="#00C2A0" strokeWidth="2.8"/>
        <circle cx="20" cy="16" r="5" stroke="#34D399" strokeWidth="2.8"/>
        <circle cx="16" cy="16" r="2" fill="#FFFFFF"/>
      </svg>
    );
  }

  // Generic Digital Wallet fallback
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" style={{ borderRadius: '6px', flexShrink: 0, ...style }}>
      <rect width="32" height="32" rx="7" fill="#059669" />
      <rect x="7" y="9" width="18" height="14" rx="3" stroke="#FFFFFF" strokeWidth="2.2" />
      <circle cx="20" cy="16" r="2" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Checks whether a given payment method identifier represents a digital wallet or online method
 */
export function isDigitalWalletMethod(methodName) {
  if (!methodName) return false;
  const lower = String(methodName).toLowerCase().trim();
  if (lower === 'cash' || lower === 'counter') return false;
  return true;
}

