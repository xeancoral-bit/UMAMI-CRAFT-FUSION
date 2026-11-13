import React from 'react';

/**
 * PesoReceipt Icon
 * Custom SVG icon representing a receipt ticket with the Philippine Peso (₱)
 * symbol in place of the default dollar ($) sign.
 */
const EMPTY_STYLE = Object.freeze({});

export default function PesoReceipt({
  size = 18,
  color = 'currentColor',
  strokeWidth = 2,
  className = '',
  style = EMPTY_STYLE
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {/* Receipt Ticket Outline */}
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      {/* Philippine Peso ₱ Symbol: Stem & Top Loop */}
      <path d="M9.5 6.5v11" />
      <path d="M9.5 6.5h3.2a2.8 2.8 0 0 1 0 5.6H9.5" />
      {/* Double Horizontal Bars of Peso ₱ */}
      <path d="M7.5 8.2h7" />
      <path d="M7.5 10.4h7" />
    </svg>
  );
}
