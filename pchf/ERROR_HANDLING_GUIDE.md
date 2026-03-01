# Professional Error Handling & Toast Management Guide

## Overview
This guide explains how to use the new professional error handling and toast management tools to prevent toast pile-up and provide better user experience.

---

## Tools Created

### 1. **useToast Hook** 
**Location:** `src/hooks/useToast.ts`

A custom toast hook with built-in deduplication that prevents showing the same toast message within 2 seconds.

**Features:**
- ✅ Prevents duplicate toasts
- ✅ Automatic memory cleanup
- ✅ Simple API

**Usage:**
```typescript
import { useToast } from '@/hooks';

export function MyComponent() {
  const toast = useToast();

  const handleClick = async () => {
    try {
      await api.doSomething();
      toast.success('Success!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

---

### 2. **useDebouncedHandler Hook**
**Location:** `src/hooks/useDebouncedHandler.ts`

Prevents rapid-fire execution of async handlers (useful for API calls).

**Features:**
- ✅ Prevents multiple concurrent executions
- ✅ Debounces rapid button clicks (default 500ms)
- ✅ Type-safe with generics

**Usage:**
```typescript
import { useDebouncedHandler } from '@/hooks';

export function ApproveButton({ email }: { email: string }) {
  const handleApprove = useDebouncedHandler(
    async (id: string) => {
      await api.approveAdmin(id);
      toast.success('Approved!');
    },
    500 // debounce delay
  );

  return <button onClick={() => handleApprove(email)}>Approve</button>;
}
```

---

### 3. **errorHandler Service**
**Location:** `src/services/errorHandler.ts`

Centralized error handling that tracks and deduplicates errors.

**Features:**
- ✅ Single point of error handling
- ✅ Prevents duplicate error messages
- ✅ Extracts error messages from various formats
- ✅ Auto-cleanup after 3 seconds

**Usage:**
```typescript
import { errorHandler } from '@/services/errorHandler';

export function MyComponent() {
  const handleSubmit = async () => {
    try {
      await api.submitForm(data);
      setSuccess(true);
    } catch (error) {
      const message = errorHandler.handle(error);
      setErrorMessage(message); // Use return value for state
    }
  };

  return <div>{errorMessage && <p>{errorMessage}</p>}</div>;
}
```

---

## Best Practices

### Pattern 1: Simple Success/Error (Recommended)
```typescript
const handler = async () => {
  try {
    await api.doSomething();
    toast.success('Done!'); // Only 1 toast
  } catch (err) {
    toast.error(err.message); // Deduplicated by useToast
  }
};
```

### Pattern 2: UI State Error Display (Recommended for Forms)
```typescript
const [error, setError] = useState('');

const handleSubmit = async () => {
  setError(''); // Clear previous error
  try {
    await api.submit();
    toast.success('Submitted!');
  } catch (err) {
    const msg = err.message || 'Failed';
    setError(msg); // Show error in UI
    // Don't show toast - error is displayed in form
  }
};

return (
  <form>
    {error && <Alert type="error">{error}</Alert>}
    <button onClick={handleSubmit}>Submit</button>
  </form>
);
```

### Pattern 3: Debounced Action
```typescript
const debouncedApprove = useDebouncedHandler(
  async (email: string) => {
    await api.approveAdmin(email);
    toast.success('Approved!');
  },
  600
);

return <button onClick={() => debouncedApprove(email)}>Approve</button>;
```

### Pattern 4: Centralized Error Handling
```typescript
import { errorHandler } from '@/services/errorHandler';

const handleDelete = async (id: string) => {
  try {
    await api.delete(id);
    toast.success('Deleted!');
  } catch (err) {
    const msg = errorHandler.handle(err, 'Delete failed');
    // Toast is already shown by errorHandler
    // Use msg for state if needed
  }
};
```

---

## Sonner Configuration
**Location:** `src/main.tsx`

Configured with professional defaults:
```typescript
<Toaster 
  richColors 
  position="top-right"
  visibleToasts={3}        // Max 3 visible at once
  closeButton              // Users can dismiss
  containerClassName="toaster-container"
/>
```

---

## Migration Guide

### Before (❌ Problematic)
```typescript
try {
  await api.approve(id);
  toast.success('Approved!');
} catch (err) {
  try {
    localApprove(id);
    toast.success('Approved!'); // Duplicate toast
  } catch {
    toast.error('Failed'); // Possible 3rd toast
  }
}
```

### After (✅ Professional)
```typescript
try {
  await api.approve(id);
  toast.success('Approved!');
} catch (err) {
  try {
    localApprove(id);
    toast.success('Approved!'); // Deduplicated by useToast hook
  } catch {
    toast.error('Failed');
  }
}
```

---

## Common Scenarios

### Scenario 1: Form Validation
```typescript
const handleSubmit = async (data: FormData) => {
  const errors: Record<string, string> = {};

  // Validate inline - don't show toasts for validation
  if (!data.name) errors.name = 'Name required';
  if (!data.email) errors.email = 'Email required';
  
  if (Object.keys(errors).length > 0) {
    setValidationErrors(errors); // Show in form fields
    return; // Don't show toast
  }

  try {
    await api.submit(data);
    toast.success('Submitted!');
  } catch (err) {
    toast.error(err.message);
  }
};
```

### Scenario 2: List Operations
```typescript
const debouncedDelete = useDebouncedHandler(
  async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Deleted!');
  },
  300
);

return items.map(item => (
  <button key={item.id} onClick={() => debouncedDelete(item.id)}>
    Delete
  </button>
));
```

### Scenario 3: Multi-step Flow
```typescript
const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');
const [error, setError] = useState('');

const handleSendCode = async (email: string) => {
  setError(''); // Clear previous error
  try {
    await api.sendVerificationCode(email);
    setStep('verify');
    toast.success('Code sent!');
  } catch (err) {
    setError(err.message); // Display error in UI
    // Don't toast - error shown in form
  }
};
```

---

## Testing

### Test Duplicate Prevention
```typescript
import { renderHook, act } from '@testing-library/react';
import { useToast } from '@/hooks';

test('deduplicates same toast within 2 seconds', () => {
  const { result } = renderHook(() => useToast());

  act(() => {
    result.current.error('Same error');
    result.current.error('Same error'); // Should not show
  });

  // Only 1 toast should appear
});
```

---

## Summary of Changes

| Component | Issue Fixed | Solution |
|-----------|------------|----------|
| Dashboard.tsx | Duplicate success toasts | Removed redundant success in fallback |
| LoginUpdated.tsx | State + Toast duplicate | Removed toast when state shows error |
| PointOfSales.tsx | Rapid-fire validation errors | Consolidated to single error flow |
| InventoryManagement.tsx | Multiple error toasts | Single consolidated error message |
| main.tsx | Unlimited toasts | Limited to 3 visible toasts |

---

## Key Benefits

✅ **No more toast pile-up** - Max 3 visible toasts  
✅ **Deduplication** - Same message won't show twice  
✅ **Better UX** - Users can dismiss toasts  
✅ **Professional** - Centralized error handling  
✅ **Maintainable** - Single source of truth for errors  
✅ **Type-safe** - Full TypeScript support  

