# 🔍 BACKEND CONFLICT DETECTION GUIDE

**Date**: Created  
**Purpose**: Detect and resolve conflicts between Docker containers and local backend instances

---

## 🎯 CURRENT STATUS

### **Docker Desktop**: ❌ NOT RUNNING
```
Error: Cannot connect to Docker daemon
```

### **Local Backend**: ✅ RUNNING
```
Port 4000: LISTENING
Process ID: 1184
```

---

## 📋 DIAGNOSTIC STEPS

### **1. List Running Docker Containers**

```bash
docker ps
```

**Check for**:
- Containers using port 4000
- Port mapping like `0.0.0.0:4000->3000/tcp` or `0.0.0.0:4000->4000/tcp`

**Example Output**:
```
CONTAINER ID   IMAGE              PORTS                    NAMES
abc123def456   lonaat-backend     0.0.0.0:4000->4000/tcp   backend-1
```

---

### **2. Identify Backend Container**

**Look for container names**:
- `backend`
- `api`
- `server`
- `lonaat-backend`
- `backend-node`

**Get container ID**:
```bash
docker ps --filter "publish=4000"
```

---

### **3. Inspect Container Logs**

```bash
docker logs <container_id>
```

**Success Indicators** ✅:
```
🔥 AUTH ROUTES LOADED
✅ Server running on port 4000
📊 Database connected
```

**Failure Indicators** ❌:
```
Error: Cannot find module
EADDRINUSE: address already in use
No auth route logs
```

---

### **4. Check Local Node.js Processes**

**Windows**:
```powershell
netstat -ano | findstr :4000
```

**Find process**:
```powershell
tasklist | findstr <PID>
```

**Example**:
```
TCP    0.0.0.0:4000    LISTENING    1184
node.exe    1184
```

---

### **5. Stop ALL Docker Containers**

```bash
# Stop all running containers
docker stop $(docker ps -q)

# Or stop specific container
docker stop <container_id>
```

---

### **6. Remove Containers (Important)**

```bash
# Remove all stopped containers
docker rm $(docker ps -aq)

# Or remove specific container
docker rm <container_id>
```

---

### **7. Rebuild Backend Container**

```bash
# Rebuild without cache (ensures fresh code)
docker-compose build --no-cache

# Or rebuild specific service
docker-compose build --no-cache backend
```

---

### **8. Start Fresh**

```bash
# Start all services
docker-compose up

# Or start in detached mode
docker-compose up -d

# Or start specific service
docker-compose up backend
```

---

### **9. Verify Correct Container**

```bash
# Check logs of new container
docker logs <new_container_id>

# Or follow logs in real-time
docker logs -f <new_container_id>
```

**Must show**:
```
🔥 AUTH ROUTES LOADED
✅ Server running on port 4000
📡 API endpoints registered
```

---

### **10. Confirm Port Mapping**

```bash
docker ps
```

**Correct mapping**:
```
0.0.0.0:4000->4000/tcp
```

**Incorrect mapping**:
```
0.0.0.0:4000->3000/tcp  # Wrong internal port
```

---

### **11. Test Auth Endpoint**

```bash
curl http://localhost:4000/api/auth/login
```

**Success** ✅:
```json
{
  "success": false,
  "error": "Missing credentials"
}
```

**Failure** ❌:
```
Cannot GET /api/auth/login
404 Not Found
```

---

## 🚨 CONFLICT SCENARIOS

### **Scenario 1: Docker + Local Both Running**

**Symptoms**:
- Port 4000 shows LISTENING
- Docker container also running
- One instance gets `EADDRINUSE` error

**Solution**:
```bash
# Stop Docker containers
docker stop $(docker ps -q)

# OR stop local Node.js
taskkill /PID <process_id> /F
```

---

### **Scenario 2: Old Docker Container Running**

**Symptoms**:
- Container running but old code
- No "AUTH ROUTES LOADED" in logs
- Endpoints return 404

**Solution**:
```bash
# Stop and remove old container
docker stop <container_id>
docker rm <container_id>

# Rebuild with no cache
docker-compose build --no-cache

# Start fresh
docker-compose up
```

---

### **Scenario 3: Multiple Docker Containers**

**Symptoms**:
- Multiple containers trying to use port 4000
- Port conflicts
- Unpredictable behavior

**Solution**:
```bash
# Stop all containers
docker stop $(docker ps -q)

# Remove all containers
docker rm $(docker ps -aq)

# Start only what you need
docker-compose up backend
```

---

### **Scenario 4: Docker Desktop Not Running**

**Symptoms**:
```
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/containers/json"
```

**Solution**:
1. Start Docker Desktop
2. Wait for it to fully start
3. Run `docker ps` to verify

**OR** use local Node.js:
```bash
cd backend-node
npm run dev
```

---

## ✅ SUCCESS CRITERIA

### **Only ONE backend instance running**
```bash
# Check Docker
docker ps | grep backend
# Should show 0 or 1 container

# Check local
netstat -ano | findstr :4000
# Should show 0 or 1 process
```

### **Correct code inside container**
```bash
docker logs <container_id> | grep "AUTH ROUTES"
# Should show: 🔥 AUTH ROUTES LOADED
```

### **Auth route responds**
```bash
curl http://localhost:4000/api/auth/login
# Should NOT return: Cannot GET /api/auth/login
```

### **Frontend errors drop significantly**
- No more "Network Error"
- No more "404 Not Found" for auth
- Login/register work correctly

---

## 🔧 QUICK DIAGNOSTIC COMMANDS

### **Check Everything**
```bash
# Docker containers
docker ps

# Local processes on port 4000
netstat -ano | findstr :4000

# Container logs (if running)
docker logs <container_id>

# Test auth endpoint
curl http://localhost:4000/api/auth/login
```

---

### **Clean Slate (Nuclear Option)**
```bash
# Stop everything
docker stop $(docker ps -q)

# Remove everything
docker rm $(docker ps -aq)

# Remove images (optional)
docker rmi $(docker images -q)

# Rebuild from scratch
docker-compose build --no-cache

# Start fresh
docker-compose up
```

---

## 📊 CURRENT ENVIRONMENT STATUS

### **As of now**:
- ❌ Docker Desktop: NOT RUNNING
- ✅ Local Backend: RUNNING on port 4000 (PID: 1184)
- ✅ No container conflicts (Docker not running)

### **Recommendation**:
Since Docker Desktop is not running, you're using **local Node.js backend**.

**To verify it's working**:
```bash
curl http://localhost:4000/api/auth/login
```

**Expected response**:
```json
{
  "success": false,
  "error": "Missing credentials"
}
```

---

## 🎯 DECISION TREE

```
Is Docker Desktop running?
├─ NO → Use local Node.js
│   ├─ cd backend-node
│   ├─ npm run dev
│   └─ Test: http://localhost:4000/api/auth/login
│
└─ YES → Check for conflicts
    ├─ docker ps (any containers on port 4000?)
    │   ├─ YES → Check logs for "AUTH ROUTES LOADED"
    │   │   ├─ YES → Container is correct, use it
    │   │   └─ NO → Rebuild container
    │   └─ NO → Start container
    │       └─ docker-compose up
    │
    └─ Is local Node.js also running?
        ├─ YES → CONFLICT! Stop one of them
        │   ├─ Stop Docker: docker stop $(docker ps -q)
        │   └─ Stop local: taskkill /PID <pid> /F
        └─ NO → Good, only one instance
```

---

## 📝 TROUBLESHOOTING CHECKLIST

- [ ] Docker Desktop running? (`docker ps`)
- [ ] Any containers on port 4000? (`docker ps --filter "publish=4000"`)
- [ ] Container logs show auth routes? (`docker logs <id> | grep AUTH`)
- [ ] Local Node.js on port 4000? (`netstat -ano | findstr :4000`)
- [ ] Only ONE backend instance total?
- [ ] Auth endpoint responds? (`curl http://localhost:4000/api/auth/login`)
- [ ] Frontend can connect? (Check browser console)

---

**CONFLICT DETECTION COMPLETE** ✅

Use this guide to identify and resolve backend conflicts between Docker and local instances.
