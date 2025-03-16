# Xero Integration Guide

This document explains our approach to handling discounts in a way that is compatible with Xero's model.

## Discount Implementation

We've updated our system to align with Xero's approach to discounts:

1. **Negative Line Items**: Rather than storing discounts separately at the invoice level, discounts are now represented as negative line items within the invoice. This matches how Xero handles discounts internally.

2. **Simplified Database Schema**: We've simplified our database by replacing three discount-related columns (`discount_type`, `discount_value`, and `discount_amount`) with a single `discount_total` column that represents the sum of all negative line items.

## Adding Discounts

To add a discount to an invoice:

1. Add a regular line item using the "Add Item" button
2. For the description, enter what the discount is for (e.g., "Loyalty Discount", "Bundle Discount")
3. Enter a **negative value** in the price field (e.g., `-10.00` for a €10 discount)

You can add multiple line items with negative values for different types of discounts if needed.

## Xero Synchronization

When syncing with Xero:

1. **To Xero**: All line items (including negative discount items) are sent directly to Xero without transformation.

2. **From Xero**: Any negative line items from Xero will be imported as discount line items in our system.

This approach ensures that:
- Data is consistent between systems
- No complex transformations are needed
- Discounts can be applied at a granular level (per item if desired)

## Subtotal and Total Calculations

- **Subtotal**: The sum of all positive line items
- **Discount Total**: The absolute sum of all negative line items
- **Total**: The net sum of all line items (positive and negative)

## Reporting Considerations

When running reports:
- Line items with negative prices are identified as discounts
- The `discount_total` field provides a quick way to find invoices with discounts 