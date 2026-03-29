# 🧠 AI MEMORY SYSTEM - REFINED IMPLEMENTATION PLAN

**Date**: March 28, 2026  
**Status**: Planning Phase - NO IMPLEMENTATION  
**Objective**: Add AI memory system with ZERO duplication

---

## 📋 KEY REFINEMENTS

1. ✅ Added **System Registry** (`/core/ai/registry/system.registry.ts`)
2. ✅ Added **File Scanner** (`/core/ai/rules/file-scanner.ts`)
3. ✅ Defined **Source of Truth Services** (no alternatives)
4. ✅ Reordered to **8 phases** (more granular)
5. ✅ Enforced **strict route structure** (`/api/ai-system/*` only)
6. ✅ Added **agent prevention rules** (never duplicate, never modify)

---

## 🏗️ DIRECTORY STRUCTURE

```
src/core/ai/
├── registry/
│   ├── system.registry.ts          # ✅ NEW - Central registry
│   └── registry.types.ts
├── memory/
│   ├── memory.service.ts
│   ├── memory.types.ts
│   └── memory.initializer.ts
├── logs/
│   ├── logger.service.ts
│   ├── log.types.ts
│   └── log.analyzer.ts
├── rules/
│   ├── rules.service.ts
│   ├── system.rules.ts
│   ├── duplicate.checker.ts
│   └── file-scanner.ts             # ✅ NEW - File scanner
├── agents/
│   ├── ollama.service.ts
│   ├── agent.types.ts
│   └── fix.suggester.ts
├── pipelines/
│   ├── debug.pipeline.ts
│   ├── audit.pipeline.ts
│   └── pipeline.executor.ts
├── middleware/
│   ├── error-capture.ts
│   └── request-logger.ts
└── routes/
    └── ai-system.routes.ts
```

---

## 📚 SOURCE OF TRUTH SERVICES

**CRITICAL**: AI system MUST use these. NO alternatives allowed.

### **1. Products** → `productImporter.ts`
```typescript
// ✅ CORRECT
import { importAllProducts } from '../../services/productImporter';

// ❌ WRONG - Never create alternative
```

**Functions**: `importAllProducts()`, `validateProducts()`, `deduplicateProducts()`

---

### **2. Affiliate** → `realAffiliateConnector.ts`
```typescript
// ✅ CORRECT
import { realAffiliateConnector } from '../../services/realAffiliateConnector';
```

**Methods**: `fetchDigistore24Products()`, `fetchAdmitadProducts()`, `syncAllAffiliateProducts()`

---

### **3. Tokens** → `token.service.ts`
```typescript
// ✅ CORRECT
import { deductTokens, addTokens } from '../../services/token.service';

// ❌ WRONG - Never use tokenService.ts (different service)
```

**Functions**: `deductTokens()`, `addTokens()`, `requireTokens()`  
**Note**: Uses `AdTokenWallet` model (NOT `TokenAccount`)

---

### **4. AI** → `ai.manager.ts`
```typescript
// ✅ CORRECT
import { aiManager } from '../../services/ai.manager';
```

**Purpose**: Existing AI content generation

---

## 🗂️ SYSTEM REGISTRY

**File**: `/core/ai/registry/system.registry.ts`

**Purpose**: Central registry tracking all modules to prevent duplication

**Key Functions**:
- `serviceExists(name)` - Check if service exists
- `getService(name)` - Get canonical service
- `routeExists(path)` - Check if route path used

**Registry Entry Example**:
```typescript
{
  name: 'productImporter',
  path: 'src/services/productImporter.ts',
  type: 'service',
  status: 'active',
  exports: ['importAllProducts', 'validateProducts'],
  dependencies: ['prisma', 'admitadImporter']
}
```

---

## 🔍 FILE SCANNER

**File**: `/core/ai/rules/file-scanner.ts`

**Purpose**: Scan file system to detect duplicates

**Key Functions**:
- `scanDirectory(dir)` - Scan all files
- `fileExists(path)` - Check if file exists
- `findDuplicates(dir)` - Find duplicate files
- `findSimilarExports(dir)` - Find duplicate exports

**Usage**:
```typescript
const duplicates = await findDuplicates('src/services');
if (duplicates.size > 0) {
  console.log('Duplicate files found:', duplicates);
}
```

---

## 🚫 AGENT PREVENTION RULES

### **RULE 1: Never Create Duplicate Services**
```typescript
// Before creating service:
if (serviceExists('productImporter')) {
  throw new Error('Service already exists - use existing');
}
```

### **RULE 2: Never Modify Existing Files**
```typescript
// ✅ CORRECT - Import and use
import { getWalletBalance } from '../../services/walletService';

// ❌ WRONG - Modify existing file
```

### **RULE 3: Never Create Alternative Implementations**
```typescript
// ✅ CORRECT - Use source of truth
const service = getService('products');
import from service.path;

// ❌ WRONG - Create alternative
```

### **RULE 4: Strict Route Structure**
```typescript
// ✅ CORRECT
app.use('/api/ai-system', routes);

// ❌ WRONG - /api/ai already occupied
app.use('/api/ai', routes);
```

### **RULE 5: File Scanner Before Creation**
```typescript
// Before creating file:
if (fileExists('path/to/file.ts')) {
  throw new Error('File already exists');
}
```

### **RULE 6: Registry Check Before Import**
```typescript
// Before importing:
const service = getService('products');
if (!service) {
  throw new Error('Service not found in registry');
}
```

---

## 📋 8-PHASE ROLLOUT

### **Phase 1: Database** (Week 1)
**Tasks**:
- Create migration file
- Add 4 models: `ai_memory`, `ai_logs`, `ai_rules`, `ai_pipeline_runs`
- Run `npx prisma db push`

**Risk**: LOW  
**Rollback**: `DROP TABLE ai_*`

---

### **Phase 2: Memory** (Week 2)
**Tasks**:
- Create `/core/ai/registry/` with `system.registry.ts`
- Create `/core/ai/memory/` with `memory.service.ts`
- Populate SYSTEM_REGISTRY

**Risk**: LOW  
**Rollback**: Delete `/core/ai/`

---

### **Phase 3: Logs** (Week 3)
**Tasks**:
- Create `/core/ai/logs/` with `logger.service.ts`
- Implement logging functions

**Risk**: LOW  
**Rollback**: Delete `/core/ai/logs/`

---

### **Phase 4: Rules** (Week 4)
**Tasks**:
- Create `/core/ai/rules/` with `file-scanner.ts`
- Implement AGENT_RULES
- Test duplicate detection

**Risk**: LOW  
**Rollback**: Delete `/core/ai/rules/`

---

### **Phase 5: Ollama** (Week 5)
**Tasks**:
- Install Ollama
- Pull `llama3` model
- Create `/core/ai/agents/` with `ollama.service.ts`

**Risk**: LOW  
**Rollback**: Uninstall Ollama

---

### **Phase 6: Routes** (Week 6)
**Tasks**:
- Create `/core/ai/routes/ai-system.routes.ts`
- Mount on `/api/ai-system/*`
- Add authentication

**Endpoints**:
- `GET /api/ai-system/memory/:key`
- `POST /api/ai-system/memory`
- `GET /api/ai-system/logs/:type`
- `GET /api/ai-system/registry`
- `POST /api/ai-system/scan`
- `POST /api/ai-system/ask`

**Risk**: LOW  
**Rollback**: Remove route mount

---

### **Phase 7: Middleware** (Week 7)
**Tasks**:
- Create `/core/ai/middleware/error-capture.ts`
- Add `AI_SYSTEM_ENABLED` env variable
- Mount middleware (OPTIONAL, disabled by default)

**Integration**:
```typescript
if (process.env.AI_SYSTEM_ENABLED === 'true') {
  app.use(apiDebugMiddleware);
}
```

**Risk**: MEDIUM  
**Rollback**: Set `AI_SYSTEM_ENABLED=false`

---

### **Phase 8: Pipelines** (Week 8)
**Tasks**:
- Create `/core/ai/pipelines/debug.pipeline.ts`
- Create `/core/ai/pipelines/audit.pipeline.ts`
- Add manual trigger endpoints

**Pipelines**:
- Debug pipeline: Analyzes errors, suggests fixes
- Audit pipeline: Scans for duplicates, validates registry

**Risk**: MEDIUM  
**Rollback**: Delete `/core/ai/pipelines/`

---

## 🔒 STRICT ROUTE STRUCTURE

### **Allowed** ✅
```
/api/ai-system/memory/:key
/api/ai-system/logs/:type
/api/ai-system/registry
/api/ai-system/scan
/api/ai-system/ask
/api/ai-system/pipeline/debug
/api/ai-system/pipeline/audit
```

### **Forbidden** ❌
```
/api/ai/*           # Already occupied by 6 routes
/api/memory/*       # Alternative path
/api/ai-admin/*     # Alternative path
/ai-system/*        # Missing /api prefix
```

---

## 📊 IMPLEMENTATION CHECKLIST

### **Phase 1: Database**
- [ ] Create migration file
- [ ] Update Prisma schema
- [ ] Run `npx prisma db push`
- [ ] Verify tables exist

### **Phase 2: Memory**
- [ ] Create `/core/ai/registry/system.registry.ts`
- [ ] Create `/core/ai/memory/memory.service.ts`
- [ ] Populate SYSTEM_REGISTRY
- [ ] Test memory operations

### **Phase 3: Logs**
- [ ] Create `/core/ai/logs/logger.service.ts`
- [ ] Test logging functions

### **Phase 4: Rules**
- [ ] Create `/core/ai/rules/file-scanner.ts`
- [ ] Implement AGENT_RULES
- [ ] Test duplicate detection

### **Phase 5: Ollama**
- [ ] Install Ollama
- [ ] Pull llama3 model
- [ ] Create `/core/ai/agents/ollama.service.ts`
- [ ] Test basic prompts

### **Phase 6: Routes**
- [ ] Create `/core/ai/routes/ai-system.routes.ts`
- [ ] Mount on `/api/ai-system`
- [ ] Test all endpoints

### **Phase 7: Middleware**
- [ ] Create `/core/ai/middleware/error-capture.ts`
- [ ] Add `AI_SYSTEM_ENABLED` env variable
- [ ] Test error logging

### **Phase 8: Pipelines**
- [ ] Create debug pipeline
- [ ] Create audit pipeline
- [ ] Test pipeline execution

---

## ✅ SUCCESS CRITERIA

- [ ] System registry tracks all modules
- [ ] File scanner detects duplicates
- [ ] Memory service stores system state
- [ ] Logs capture all errors
- [ ] Rules prevent duplication
- [ ] Ollama provides fix suggestions
- [ ] Routes work on `/api/ai-system/*`
- [ ] Middleware captures errors (optional)
- [ ] Pipelines run successfully
- [ ] Zero modifications to existing files
- [ ] Zero duplicate services created

---

## 🎯 NEXT STEPS

1. **Review this refined plan**
2. **Approve Phase 1** (database)
3. **Test current system**: `node test-full-flow.js`
4. **Begin implementation** when ready

**All planning complete. No code generated. No files modified.**
