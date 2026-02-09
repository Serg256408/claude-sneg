import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { NotificationProvider } from '../../NotificationContext';
import { ToastProvider } from '../../ToastContext';

const renderApp = () =>
  render(
    <NotificationProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </NotificationProvider>
  );

describe('App smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const getItemMock = localStorage.getItem as unknown as ReturnType<typeof vi.fn>;
    getItemMock.mockImplementation(() => null);
  });

  it('renders main application shell', () => {
    renderApp();
    expect(screen.getByText('SnowForce Dispatch')).toBeInTheDocument();
  });

  it('migrates legacy manager message role to dispatcher before persistence', async () => {
    const now = new Date().toISOString();
    const legacyOrder = {
      id: 'legacy-order-1',
      orderNumber: 'SF-LEGACY-1',
      executionMode: 'marketplace',
      serviceType: 'snow',
      customer: 'Legacy customer',
      address: 'Legacy address',
      coordinates: [55.75, 37.61],
      assetRequirements: [],
      bids: [],
      assignments: [],
      assignedDrivers: [],
      driverDetails: [],
      applicants: [],
      plannedTrips: 0,
      actualTrips: 0,
      evidences: [],
      isPaid: false,
      scheduledTime: now,
      status: 'new_request',
      managerName: 'АЛЕКСАНДР',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: 'msg-1',
          orderId: 'legacy-order-1',
          fromRole: 'manager',
          fromName: 'Legacy manager',
          toRole: 'manager',
          text: 'Legacy message',
          timestamp: now,
          isRead: false,
        },
      ],
      actionLog: [],
    };

    const getItemMock = localStorage.getItem as unknown as ReturnType<typeof vi.fn>;
    getItemMock.mockImplementation((key: string) => {
      if (key === 'snowforce_orders_v1') return JSON.stringify([legacyOrder]);
      return null;
    });

    renderApp();

    await waitFor(() => {
      const setItemMock = localStorage.setItem as unknown as ReturnType<typeof vi.fn>;
      const ordersPersistCalls = setItemMock.mock.calls.filter(([key]) => key === 'snowforce_orders_v1');
      expect(ordersPersistCalls.length).toBeGreaterThan(0);
      const latestPayload = ordersPersistCalls[ordersPersistCalls.length - 1][1] as string;
      const persistedOrders = JSON.parse(latestPayload);
      expect(persistedOrders[0].messages[0].fromRole).toBe('dispatcher');
      expect(persistedOrders[0].messages[0].toRole).toBe('dispatcher');
    });
  });
});
