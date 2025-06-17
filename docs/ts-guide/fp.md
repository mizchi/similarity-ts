# Functional Domain Modeling Guide

This guide provides patterns and practices for functional domain modeling in TypeScript.

## Overview

Functional domain modeling uses algebraic data types and pure functions to create robust, testable domain models. This approach emphasizes:

- **Type Safety**: Use the type system to make illegal states unrepresentable
- **Pure Functions**: Domain logic should be pure and synchronous
- **Branded Types**: Create type-safe wrappers for primitive values
- **Testability**: Pure functions are easy to test without mocks

## Project Structure

```
src/
├── core/           # Pure domain models and logic
│   ├── user.ts     # User domain model
│   ├── order.ts    # Order domain model
│   └── shared.ts   # Shared types and utilities
├── infra/          # Infrastructure and side effects
└── app/            # Application layer
```

## Algebraic Data Types

### Sum Types (Tagged Unions)

```typescript
// core/order.ts
export type OrderStatus =
  | { type: "draft" }
  | { type: "submitted"; submittedAt: Date }
  | { type: "processing"; startedAt: Date }
  | { type: "completed"; completedAt: Date }
  | { type: "cancelled"; reason: string; cancelledAt: Date };

export type Order = {
  id: OrderId;
  customerId: CustomerId;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
};
```

### Product Types (Records)

```typescript
// core/user.ts
export type User = {
  id: UserId;
  email: Email;
  name: UserName;
  role: UserRole;
  createdAt: Date;
};

export type UserName = {
  first: string;
  last: string;
};
```

## Branded Types

Create type-safe wrappers for primitive values to prevent mixing different types of IDs or values:

```typescript
// core/shared.ts
declare const brand: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  [brand]: TBrand;
};

// ID types
export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type CustomerId = Brand<string, "CustomerId">;

// Value types
export type Email = Brand<string, "Email">;
export type Currency = Brand<number, "Currency">;

// Constructor functions
export const UserId = (id: string): UserId => id as UserId;
export const OrderId = (id: string): OrderId => id as OrderId;
export const Email = (email: string): Email => email as Email;
export const Currency = (amount: number): Currency => amount as Currency;

// Type guards
export const isUserId = (value: unknown): value is UserId =>
  typeof value === "string" && value.length > 0;

export const isEmail = (value: unknown): value is Email =>
  typeof value === "string" && value.includes("@");
```

## Domain Logic

Keep domain logic pure and synchronous:

```typescript
// core/order.ts
import { OrderId, CustomerId, Currency } from "./shared.ts";

export type OrderItem = {
  productId: string;
  quantity: number;
  price: Currency;
};

// Pure functions for domain logic
export function calculateTotal(items: OrderItem[]): Currency {
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  return Currency(total);
}

export function canCancelOrder(order: Order): boolean {
  return order.status.type === "draft" || order.status.type === "submitted";
}

export function cancelOrder(order: Order, reason: string, now: Date): Order {
  if (!canCancelOrder(order)) {
    throw new Error(`Cannot cancel order in status: ${order.status.type}`);
  }

  return {
    ...order,
    status: {
      type: "cancelled",
      reason,
      cancelledAt: now,
    },
  };
}

// State transitions
export function submitOrder(order: Order, now: Date): Order {
  if (order.status.type !== "draft") {
    throw new Error("Can only submit draft orders");
  }

  return {
    ...order,
    status: {
      type: "submitted",
      submittedAt: now,
    },
  };
}
```

## Testing Domain Logic

Pure functions are easy to test:

```typescript
// core/order.test.ts
import { test, expect } from "vitest";
import {
  calculateTotal,
  canCancelOrder,
  cancelOrder,
  OrderId,
  CustomerId,
  Currency,
} from "./order.ts";

test("calculateTotal sums item prices correctly", () => {
  const items = [
    { productId: "p1", quantity: 2, price: Currency(10.0) },
    { productId: "p2", quantity: 1, price: Currency(5.5) },
  ];

  expect(calculateTotal(items)).toBe(Currency(25.5));
});

test("canCancelOrder returns true for draft orders", () => {
  const order = {
    id: OrderId("o1"),
    customerId: CustomerId("c1"),
    items: [],
    status: { type: "draft" as const },
    createdAt: new Date(),
  };

  expect(canCancelOrder(order)).toBe(true);
});

test("cancelOrder throws for completed orders", () => {
  const order = {
    id: OrderId("o1"),
    customerId: CustomerId("c1"),
    items: [],
    status: {
      type: "completed" as const,
      completedAt: new Date(),
    },
    createdAt: new Date(),
  };

  expect(() => cancelOrder(order, "test", new Date())).toThrow();
});
```

## Integration with Infrastructure

Keep side effects at the boundaries and test them with integration tests:

```typescript
// infra/orderRepository.ts
import { Order, OrderId } from "../core/order.ts";
import { Result, ok, err } from "neverthrow";

export interface OrderRepository {
  findById(id: OrderId): Promise<Result<Order | null, Error>>;
  save(order: Order): Promise<Result<void, Error>>;
}

// app/orderService.ts
import { OrderRepository } from "../infra/orderRepository.ts";
import { cancelOrder as cancelOrderPure } from "../core/order.ts";
import { Result } from "neverthrow";

export class OrderService {
  constructor(private orderRepo: OrderRepository) {}

  async cancelOrder(
    orderId: OrderId,
    reason: string,
  ): Promise<Result<void, Error>> {
    const orderResult = await this.orderRepo.findById(orderId);

    return orderResult.andThen((order) => {
      if (!order) {
        return err(new Error("Order not found"));
      }

      try {
        const cancelledOrder = cancelOrderPure(order, reason, new Date());
        return this.orderRepo.save(cancelledOrder);
      } catch (error) {
        return err(error as Error);
      }
    });
  }
}
```

## Testing Infrastructure Layer

Infrastructure code should be tested with integration tests:

```typescript
// infra/orderRepository.test.ts
import { test, expect } from "vitest";
import { OrderRepository } from "./orderRepository.ts";
import { OrderId, CustomerId } from "../core/shared.ts";
import { setupTestDatabase, cleanupTestDatabase } from "../test/helpers.ts";

test("OrderRepository.findById returns order when exists", async () => {
  const db = await setupTestDatabase();
  const repo = new OrderRepository(db);

  const testOrder = {
    id: OrderId("test-123"),
    customerId: CustomerId("customer-1"),
    items: [],
    status: { type: "draft" as const },
    createdAt: new Date(),
  };

  await repo.save(testOrder);
  const result = await repo.findById(OrderId("test-123"));

  expect(result.isOk()).toBe(true);
  expect(result._unsafeUnwrap()?.id).toBe(OrderId("test-123"));

  await cleanupTestDatabase(db);
});

// app/orderService.test.ts - Integration test for service layer
import { test, expect, vi } from "vitest";
import { OrderService } from "./orderService.ts";
import { OrderRepository } from "../infra/orderRepository.ts";
import { ok, err } from "neverthrow";

test("OrderService.cancelOrder integrates with repository", async () => {
  const mockRepo: OrderRepository = {
    findById: vi.fn().mockResolvedValue(
      ok({
        id: OrderId("o1"),
        customerId: CustomerId("c1"),
        items: [],
        status: { type: "draft" },
        createdAt: new Date(),
      }),
    ),
    save: vi.fn().mockResolvedValue(ok(undefined)),
  };

  const service = new OrderService(mockRepo);
  const result = await service.cancelOrder(OrderId("o1"), "test reason");

  expect(result.isOk()).toBe(true);
  expect(mockRepo.save).toHaveBeenCalledWith(
    expect.objectContaining({
      status: expect.objectContaining({ type: "cancelled" }),
    }),
  );
});
```

## AI Assistant Prompt Integration

Add to your CLAUDE.md or project prompts:

```markdown
## Domain Modeling Rules

When implementing domain logic:

1. **Use Algebraic Data Types**: Model domain with sum types (tagged unions) and product types
2. **Keep Core Pure**: All functions in `core/` must be pure and synchronous (no async/await)
3. **Use Branded Types**: Wrap primitive types (string IDs, emails, etc.) with branded types
4. **Test Domain Logic**: Write unit tests for all domain functions
5. **Test Infrastructure**: Write integration tests for all IO operations in `infra/`
6. **Separate Concerns**: Keep side effects in `infra/`, pure logic in `core/`

Example structure:

- `core/` - Pure domain models and business logic (unit tests)
- `infra/` - Database, API, and other side effects (integration tests)
- `app/` - Application services that coordinate between core and infra (integration tests)
```

## Best Practices

### Do:

- Model your domain with types first
- Make illegal states unrepresentable
- Keep domain logic pure and testable
- Use branded types for type safety
- Test domain logic thoroughly

### Don't:

- Put async functions in core domain
- Mix infrastructure concerns with domain logic
- Use classes for pure data (prefer types/interfaces)
- Throw exceptions in domain logic (use Result types)

## Benefits

1. **Type Safety**: Branded types prevent mixing different IDs
2. **Testability**: Pure functions are trivial to test
3. **Maintainability**: Clear separation of concerns
4. **Refactoring**: Type system guides safe changes
5. **Documentation**: Types serve as living documentation

## Next Steps

1. Start with modeling your core domain types
2. Implement pure functions for business logic
3. Add branded types for all IDs and values
4. Write comprehensive tests for domain logic
5. Build infrastructure adapters around the pure core
