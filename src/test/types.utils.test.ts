import { describe, expect, it } from 'vitest';
import {
  AssetType,
  ExecutionMode,
  Order,
  OrderStatus,
  PriceUnit,
  ServiceType,
  calculateOrderTotals,
  getUnitsForRequirement,
  normalizeOrderStatus,
} from '../../types';

const makeBaseOrder = (overrides: Partial<Order> = {}): Order => {
  const now = new Date().toISOString();
  return {
    id: 'order-1',
    executionMode: ExecutionMode.MARKETPLACE,
    serviceType: ServiceType.SNOW,
    customer: 'Test customer',
    address: 'Test address',
    coordinates: [55.7512, 37.6184],
    assetRequirements: [],
    assignments: [],
    driverDetails: [],
    isPaid: false,
    createdAt: now,
    scheduledTime: now,
    managerName: 'АЛЕКСАНДР',
    status: OrderStatus.NEW_REQUEST,
    ...overrides,
  };
};

describe('normalizeOrderStatus', () => {
  it('maps draft to new_request', () => {
    expect(normalizeOrderStatus(OrderStatus.DRAFT)).toBe(OrderStatus.NEW_REQUEST);
  });

  it('maps dispute to in_progress', () => {
    expect(normalizeOrderStatus(OrderStatus.DISPUTE)).toBe(OrderStatus.IN_PROGRESS);
  });
});

describe('getUnitsForRequirement', () => {
  it('returns actual trips for truck in actual_or_planned mode', () => {
    const req = {
      id: 'req-1',
      type: AssetType.TRUCK,
      contractorId: '',
      contractorName: '',
      plannedUnits: 1,
      customerPrice: 100,
      contractorPrice: 80,
      priceUnit: PriceUnit.PER_TRIP,
    };
    const order = makeBaseOrder({
      status: OrderStatus.IN_PROGRESS,
      plannedTrips: 10,
      assetRequirements: [req],
      evidences: [
        { id: 'e1', orderId: 'order-1', tripNumber: 1, driverName: 'D1', timestamp: new Date().toISOString(), photos: [], confirmed: true },
        { id: 'e2', orderId: 'order-1', tripNumber: 2, driverName: 'D1', timestamp: new Date().toISOString(), photos: [], confirmed: true },
        { id: 'e3', orderId: 'order-1', tripNumber: 3, driverName: 'D1', timestamp: new Date().toISOString(), photos: [], confirmed: false },
      ],
    });

    expect(getUnitsForRequirement(order, req, { mode: 'actual_or_planned' })).toBe(3);
    expect(getUnitsForRequirement(order, req, { mode: 'confirmed' })).toBe(2);
    expect(getUnitsForRequirement(order, req, { mode: 'planned' })).toBe(10);
  });

  it('returns planned units for loader shift in planned mode', () => {
    const req = {
      id: 'req-2',
      type: AssetType.LOADER,
      contractorId: '',
      contractorName: '',
      plannedUnits: 2,
      customerPrice: 200,
      contractorPrice: 150,
      priceUnit: PriceUnit.PER_SHIFT,
    };
    const order = makeBaseOrder({
      status: OrderStatus.SEARCHING_EQUIPMENT,
      assetRequirements: [req],
      driverDetails: [
        {
          id: 'a1',
          orderId: 'order-1',
          driverName: 'Loader 1',
          assetType: AssetType.LOADER,
          assignedPrice: 150,
          priceUnit: PriceUnit.PER_SHIFT,
          status: 'working',
          shiftStartTime: '08:00',
        },
      ],
    });

    expect(getUnitsForRequirement(order, req, { mode: 'planned' })).toBe(2);
  });
});

describe('calculateOrderTotals', () => {
  it('calculates totals with charges from requirements', () => {
    const req = {
      id: 'req-3',
      type: AssetType.TRUCK,
      contractorId: '',
      contractorName: '',
      plannedUnits: 1,
      customerPrice: 100,
      contractorPrice: 50,
      priceUnit: PriceUnit.PER_TRIP,
      minimalCharge: 10,
      deliveryCharge: 5,
    };

    const order = makeBaseOrder({
      plannedTrips: 2,
      status: OrderStatus.NEW_REQUEST,
      assetRequirements: [req],
    });

    const totals = calculateOrderTotals(order, { mode: 'planned', includeCharges: true });
    expect(totals.customerTotal).toBe(215);
    expect(totals.contractorTotal).toBe(100);
    expect(totals.margin).toBe(115);
  });

  it('uses assignment earnings when assignments exist', () => {
    const req = {
      id: 'req-4',
      type: AssetType.TRUCK,
      contractorId: '',
      contractorName: '',
      plannedUnits: 1,
      customerPrice: 100,
      contractorPrice: 50,
      priceUnit: PriceUnit.PER_TRIP,
    };

    const order = makeBaseOrder({
      plannedTrips: 2,
      status: OrderStatus.IN_PROGRESS,
      assetRequirements: [req],
      driverDetails: [
        {
          id: 'd1',
          orderId: 'order-1',
          driverName: 'Driver 1',
          assetType: AssetType.TRUCK,
          assignedPrice: 40,
          priceUnit: PriceUnit.PER_TRIP,
          status: 'working',
        },
      ],
      evidences: [
        { id: 'e10', orderId: 'order-1', tripNumber: 1, driverName: 'Driver 1', assignmentId: 'd1', timestamp: new Date().toISOString(), photos: [], confirmed: true },
        { id: 'e11', orderId: 'order-1', tripNumber: 2, driverName: 'Driver 1', assignmentId: 'd1', timestamp: new Date().toISOString(), photos: [], confirmed: false },
      ],
    });

    const totals = calculateOrderTotals(order, { mode: 'actual_or_planned' });
    expect(totals.customerTotal).toBe(200);
    expect(totals.contractorTotal).toBe(80);
    expect(totals.margin).toBe(120);
  });
});
