// Event Contracts
export interface InventoryHoldCreated {
  holdId: string;
  userId: string;
  showtimeId: string;
  seatIds: string[];
  expiresAt: string;
}

export interface PaymentSucceeded {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
}

export interface OrderCompleted {
  orderId: string;
  userId: string;
  showtimeId: string;
  seatIds: string[];
  total: number;
  currency: string;
}

export interface InventorySeatsPurchased {
  showtimeId: string;
  seatIds: string[];
  orderId: string;
}

export interface InventoryHoldExpired {
  holdId: string;
  showtimeId: string;
  seatIds: string[];
}

// Domain Types
export type SeatState = 'available' | 'held' | 'purchased';

export interface Seat {
  id: string;
  section: string;
  row: string;
  number: string;
  tier: string;
  price: number;
  state: SeatState;
  accessibilityFlag?: boolean;
}

export interface Hold {
  id: string;
  showtimeId: string;
  userId: string;
  seatIds: string[];
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'converted';
}

export interface Order {
  id: string;
  userId: string;
  showtimeId: string;
  totalCents: number;
  currency: string;
  status: 'pending' | 'completed' | 'canceled' | 'refunded';
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  seatId: string;
  priceCents: number;
  tier: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  providerRef: string;
  status: 'pending' | 'succeeded' | 'failed';
  amountCents: number;
  currency: string;
}

export interface Event {
  id: string;
  orgId: string;
  title: string;
  description: string;
  category: string;
}

export interface Showtime {
  id: string;
  eventId: string;
  startsAt: string;
  endsAt: string;
  venueId: string;
}

export interface PriceTier {
  id: string;
  showtimeId: string;
  tier: string;
  priceCents: number;
  currency: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  timeZone: string;
}

export interface Section {
  id: string;
  venueId: string;
  name: string;
}

export interface SeatDefinition {
  id: string;
  sectionId: string;
  row: string;
  number: string;
  accessibilityFlag: boolean;
}

