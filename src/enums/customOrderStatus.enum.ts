export enum CustomOrderStatus {
    PENDING = 'pending',    // customer submitted, awaiting admin review
    QUOTED = 'quoted',     // admin has set a price, customer notified
    PAID = 'paid',       // customer paid
    IN_PRODUCTION = 'in_production', // being made
    READY = 'ready',      // ready for pickup / dispatch
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}