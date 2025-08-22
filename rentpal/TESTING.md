# RentPal Testing Guide

This document provides comprehensive information about the testing setup and practices for the RentPal application.

## Testing Stack

- **Unit Testing**: Vitest + React Testing Library
- **Integration Testing**: Vitest + React Testing Library + MSW
- **End-to-End Testing**: Playwright
- **Performance Testing**: Vitest + Performance API
- **Mocking**: MSW (Mock Service Worker) + Vitest mocks
- **Test Data**: Faker.js for realistic test data generation

## Test Structure

```
src/test/
├── e2e/                    # End-to-end tests
├── integration/            # Integration tests
├── performance/            # Performance tests
├── mocks/                  # Mock handlers and server setup
├── utils/                  # Test utilities and helpers
└── setup.ts               # Global test setup

src/components/*/
└── __tests__/             # Component unit tests

src/lib/
└── __tests__/             # Utility function tests

src/hooks/
└── __tests__/             # Custom hook tests
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance tests only

# Run with coverage
npm run test:coverage

# Run in watch mode
npm test

# Run with UI
npm run test:ui
```

### Advanced Test Runner

Use the custom test runner for comprehensive testing:

```bash
# Run all tests with detailed reporting
node scripts/test-runner.js all

# Run specific test suites
node scripts/test-runner.js unit
node scripts/test-runner.js integration
node scripts/test-runner.js e2e
node scripts/test-runner.js performance

# Run code quality checks
node scripts/test-runner.js lint
node scripts/test-runner.js type-check
node scripts/test-runner.js coverage
```

## Test Types

### 1. Unit Tests

Test individual components, functions, and hooks in isolation.

**Location**: `src/components/*/__tests__/`, `src/lib/__tests__/`, `src/hooks/__tests__/`

**Example**:
```typescript
import { render, screen } from '@/test/utils/test-utils'
import { ItemCard } from '../ItemCard'
import { mockItem } from '@/test/utils/test-utils'

describe('ItemCard', () => {
  it('renders item information correctly', () => {
    render(<ItemCard item={mockItem} />)
    
    expect(screen.getByText(mockItem.title)).toBeInTheDocument()
    expect(screen.getByText(`$${mockItem.daily_rate}/day`)).toBeInTheDocument()
  })
})
```

### 2. Integration Tests

Test component interactions, API integrations, and complex workflows.

**Location**: `src/test/integration/`

**Example**:
```typescript
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { BookingFlow } from '@/components/booking/BookingFlow'

describe('Booking Flow Integration', () => {
  it('completes full booking process', async () => {
    const user = userEvent.setup()
    render(<BookingFlow itemId="test-item" />)
    
    // Test complete booking workflow
    await user.selectOptions(screen.getByLabelText(/start date/i), '2024-02-15')
    await user.click(screen.getByRole('button', { name: /book now/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument()
    })
  })
})
```

### 3. End-to-End Tests

Test complete user journeys across the entire application.

**Location**: `src/test/e2e/`

**Example**:
```typescript
import { test, expect } from '@playwright/test'

test('user can complete booking flow', async ({ page }) => {
  await page.goto('/items/test-item-id')
  
  await page.click('[data-testid="book-now-button"]')
  await page.fill('[data-testid="start-date"]', '2024-02-15')
  await page.fill('[data-testid="end-date"]', '2024-02-17')
  
  await page.click('[data-testid="confirm-booking"]')
  
  await expect(page.locator('[data-testid="booking-success"]')).toBeVisible()
})
```

### 4. Performance Tests

Test application performance under various conditions.

**Location**: `src/test/performance/`

**Example**:
```typescript
import { render } from '@/test/utils/test-utils'
import { SearchResults } from '@/components/search/SearchResults'
import { generateMockItems } from '@/test/utils/test-data-generators'

describe('Search Performance', () => {
  it('renders 1000 items within acceptable time', async () => {
    const items = generateMockItems(1000)
    const startTime = performance.now()
    
    render(<SearchResults items={items} />)
    
    const endTime = performance.now()
    expect(endTime - startTime).toBeLessThan(2000) // 2 seconds
  })
})
```

## Test Utilities

### Mock Data Generation

Use the test data generators for consistent, realistic test data:

```typescript
import { 
  generateMockUser, 
  generateMockItem, 
  generateMockBooking,
  generateMockDataSet 
} from '@/test/utils/test-data-generators'

// Generate single entities
const user = generateMockUser()
const item = generateMockItem({ owner_id: user.id })

// Generate related data sets
const { users, items, bookings } = generateMockDataSet({
  userCount: 10,
  itemCount: 50,
  bookingCount: 20
})

// Generate scenario-specific data
const newUserData = generateScenarioData.newUser()
const experiencedUserData = generateScenarioData.experiencedUser()
```

### Custom Render Function

Use the custom render function that includes providers:

```typescript
import { render, screen } from '@/test/utils/test-utils'

// Automatically includes AuthProvider and other context providers
render(<MyComponent />)
```

### Mock API Responses

Use MSW for consistent API mocking:

```typescript
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// Override default handlers for specific tests
server.use(
  http.get('/api/items', () => {
    return HttpResponse.json({ items: mockItems })
  })
)
```

## Testing Best Practices

### 1. Test Structure

- **Arrange**: Set up test data and conditions
- **Act**: Perform the action being tested
- **Assert**: Verify the expected outcome

```typescript
describe('Component', () => {
  it('should do something when condition is met', () => {
    // Arrange
    const mockData = generateMockItem()
    
    // Act
    render(<Component item={mockData} />)
    
    // Assert
    expect(screen.getByText(mockData.title)).toBeInTheDocument()
  })
})
```

### 2. Test Naming

Use descriptive test names that explain the behavior:

```typescript
// Good
it('shows error message when form submission fails')
it('disables submit button while request is pending')
it('redirects to dashboard after successful login')

// Avoid
it('works correctly')
it('handles error')
it('test login')
```

### 3. Test Data

- Use realistic test data with the data generators
- Keep test data focused and minimal
- Use factories for complex object creation

### 4. Async Testing

Always use proper async/await patterns:

```typescript
it('loads data on mount', async () => {
  render(<DataComponent />)
  
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument()
  })
})
```

### 5. User Interactions

Test from the user's perspective:

```typescript
it('allows user to submit form', async () => {
  const user = userEvent.setup()
  render(<ContactForm />)
  
  await user.type(screen.getByLabelText(/name/i), 'John Doe')
  await user.type(screen.getByLabelText(/email/i), 'john@example.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  await waitFor(() => {
    expect(screen.getByText(/message sent/i)).toBeInTheDocument()
  })
})
```

## Coverage Requirements

Maintain high test coverage across the application:

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

Critical paths should have > 90% coverage:
- Authentication flows
- Payment processing
- Booking workflows
- Data validation

## Continuous Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Nightly builds

### CI Pipeline

1. **Code Quality**: ESLint, TypeScript checking
2. **Unit Tests**: Component and utility tests
3. **Integration Tests**: API and workflow tests
4. **Performance Tests**: Load and rendering tests
5. **E2E Tests**: Critical user journeys
6. **Coverage Report**: Generate and upload coverage

## Debugging Tests

### Common Issues

1. **Async Operations**: Use `waitFor` for async state changes
2. **Mock Cleanup**: Ensure mocks are reset between tests
3. **DOM Queries**: Use appropriate queries (`getByRole`, `getByLabelText`)
4. **Test Isolation**: Each test should be independent

### Debug Tools

```bash
# Run tests in debug mode
npm test -- --inspect-brk

# Run specific test file
npm test -- ItemCard.test.tsx

# Run tests matching pattern
npm test -- --grep "booking flow"

# Show test output
npm test -- --reporter=verbose
```

### Visual Debugging

Use the Vitest UI for interactive debugging:

```bash
npm run test:ui
```

Use Playwright's debug mode for E2E tests:

```bash
npm run test:e2e:ui
```

## Performance Testing

Monitor and test performance metrics:

- **Rendering Time**: Component mount and update times
- **Memory Usage**: Memory leaks and cleanup
- **Bundle Size**: Code splitting effectiveness
- **API Response Times**: Network request performance

### Performance Benchmarks

- Page load: < 2 seconds
- Component rendering: < 100ms
- Search results: < 500ms
- Form submission: < 1 second

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Add E2E tests for critical paths
5. Update this documentation if needed

### Test Checklist

- [ ] Unit tests for new components/functions
- [ ] Integration tests for complex workflows
- [ ] E2E tests for user-facing features
- [ ] Performance tests for heavy operations
- [ ] Mock data updated if needed
- [ ] Documentation updated

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)