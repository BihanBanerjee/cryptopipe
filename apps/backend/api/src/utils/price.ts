/**
 * Price utility functions for precise financial calculations
 * Uses BigInt to avoid floating-point precision errors
 * 
 * Scale: 10^8 (100,000,000) - supports 8 decimal places
 * Example: 67420.50000000 -> 6742050000000n
 */

export const PRICE_SCALE = 100000000n; // 10^8 for 8 decimal places
export const PRICE_SCALE_NUMBER = 100000000; // Number version for calculations

/**
 * Convert decimal number to integer (multiply by scale)
 */
export function toInteger(decimal: number): bigint {
  if (isNaN(decimal) || !isFinite(decimal)) {
    throw new Error(`Invalid decimal number: ${decimal}`);
  }
  
  // Round to avoid precision issues, then convert to BigInt
  const scaled = Math.round(decimal * PRICE_SCALE_NUMBER);
  return BigInt(scaled);
}

/**
 * Convert integer back to decimal number (divide by scale)
 */
export function toDecimal(integer: bigint): number {
  return Number(integer) / PRICE_SCALE_NUMBER;
}

/**
 * Multiply two price integers with proper scaling
 * Result = (a * b) / SCALE
 */
export function multiply(a: bigint, b: bigint): bigint {
  return (a * b) / PRICE_SCALE;
}

/**
 * Divide two price integers with proper scaling  
 * Result = (a * SCALE) / b
 */
export function divide(a: bigint, b: bigint): bigint {
  if (b === 0n) {
    throw new Error("Division by zero");
  }
  return (a * PRICE_SCALE) / b;
}

/**
 * Add two price integers
 */
export function add(a: bigint, b: bigint): bigint {
  return a + b;
}

/**
 * Subtract two price integers
 */
export function subtract(a: bigint, b: bigint): bigint {
  return a - b;
}

/**
 * Calculate position amount: quantity * price
 */
export function calculatePositionAmount(qtyInt: bigint, priceInt: bigint): bigint {
  return multiply(qtyInt, priceInt);
}

/**
 * Calculate margin: positionAmount / leverage
 */
export function calculateMargin(positionAmountInt: bigint, leverage: number): bigint {
  const leverageInt = toInteger(leverage);
  return divide(positionAmountInt, leverageInt);
}

/**
 * Calculate P&L for LONG position: (currentPrice - buyPrice) * quantity
 */
export function calculateLongPnL(currentPriceInt: bigint, buyPriceInt: bigint, qtyInt: bigint): bigint {
  const priceDiff = subtract(currentPriceInt, buyPriceInt);
  return multiply(priceDiff, qtyInt);
}

/**
 * Calculate P&L for SHORT position: (buyPrice - currentPrice) * quantity  
 */
export function calculateShortPnL(buyPriceInt: bigint, currentPriceInt: bigint, qtyInt: bigint): bigint {
  const priceDiff = subtract(buyPriceInt, currentPriceInt);
  return multiply(priceDiff, qtyInt);
}

/**
 * Format integer price for display (with specified decimal places)
 */
export function formatPrice(priceInt: bigint, decimals: number = 8): string {
  const decimal = toDecimal(priceInt);
  return decimal.toFixed(decimals);
}

/**
 * Parse string price to integer
 */
export function parsePrice(priceStr: string): bigint {
  const decimal = parseFloat(priceStr);
  if (isNaN(decimal)) {
    throw new Error(`Invalid price string: ${priceStr}`);
  }
  return toInteger(decimal);
}

/**
 * Validate that a BigInt is a valid price (positive)
 */
export function isValidPrice(priceInt: bigint): boolean {
  return priceInt > 0n;
}

/**
 * Validate that a BigInt is a valid quantity (positive)
 */
export function isValidQuantity(qtyInt: bigint): boolean {
  return qtyInt > 0n;
}

/**
 * Check if balance is sufficient for margin requirement
 */
export function hasSufficientBalance(balanceInt: bigint, marginInt: bigint): boolean {
  return balanceInt >= marginInt;
}

/**
 * Convert Prisma Decimal to BigInt (for migration compatibility)
 */
export function decimalToInteger(decimal: any): bigint {
  if (decimal === null || decimal === undefined) {
    return 0n;
  }
  
  // Handle Prisma Decimal objects
  if (decimal.toNumber) {
    return toInteger(decimal.toNumber());
  }
  
  // Handle regular numbers
  if (typeof decimal === 'number') {
    return toInteger(decimal);
  }
  
  // Handle strings
  if (typeof decimal === 'string') {
    return parsePrice(decimal);
  }
  
  throw new Error(`Cannot convert to integer: ${decimal}`);
}