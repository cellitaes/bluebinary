# BlueBinary - Distributed Roller Coaster Management System

A distributed, scalable roller coaster management system built with NestJS, Redis, and Docker. This system manages multiple roller coasters, their wagons, staff, and provides real-time statistics and monitoring across multiple nodes.

## 🎢 System Overview

BlueBinary is a distributed system designed to manage roller coaster operations in theme parks. It provides:

- **Distributed Architecture**: Multiple nodes can run simultaneously with automatic leader election
- **Real-time Synchronization**: Changes are synchronized across all nodes using Redis pub/sub
- **Capacity Management**: Intelligent calculation of coaster capacity, staff requirements, and operational statistics
- **Health Monitoring**: Comprehensive health checks and problem detection
- **RESTful API**: Complete CRUD operations for coasters and wagons

## 🏗️ Architecture

### Core Components

- **Coasters Service**: Manages roller coaster entities and their wagons
- **Distributed Coordinator**: Handles node registration, leader election, and data synchronization
- **Capacity Calculator**: Computes operational statistics and detects problems
- **Redis Service**: Manages distributed state and pub/sub messaging
- **JSON Storage**: File-based data persistence with automatic backups
- **Statistics Service**: Aggregates and analyzes operational data

### Distributed Features

- **Leader Election**: Automatic leader selection using Redis-based distributed locking
- **Node Heartbeat**: Regular health checks to detect and remove dead nodes
- **Event Synchronization**: Real-time data synchronization across all nodes
- **Fault Tolerance**: Automatic failover and recovery mechanisms

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Redis (handled by Docker Compose)

### Running with Docker Compose

```bash
# Clone the repository
git clone <repository-url>
cd bluebinary

# Start all services (Redis + multiple app nodes)
docker-compose up -d

# View logs
docker-compose logs -f
```

This will start:

- **Redis**: Port 6379 (distributed coordination)
- **Development Node**: Port 3050 (NODE_ID: dev-node-1)
- **Production Node 1**: Port 3051 (NODE_ID: prod-node-1)
- **Production Node 2**: Port 3052 (NODE_ID: prod-node-2)

### Local Development

```bash
# Install dependencies
npm install

# Set environment variables
export NODE_ENV=dev
export PORT=3000
export NODE_ID=local-node-1
export REDIS_HOST=localhost
export REDIS_PORT=6379
export DATA_PATH=./data/local

# Start development server
npm run start:dev

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Generate test coverage
npm run test:cov
```

## 📡 API Endpoints

### Coasters

| Method   | Endpoint                        | Description                 |
| -------- | ------------------------------- | --------------------------- |
| `GET`    | `/api/coasters`                 | Get all coasters            |
| `POST`   | `/api/coasters`                 | Create a new coaster        |
| `GET`    | `/api/coasters/:id`             | Get coaster by ID           |
| `PUT`    | `/api/coasters/:id`             | Update coaster              |
| `DELETE` | `/api/coasters/:id`             | Delete coaster              |
| `GET`    | `/api/coasters/:id/with-wagons` | Get coaster with all wagons |
| `GET`    | `/api/coasters/:id/statistics`  | Get coaster statistics      |
| `GET`    | `/api/coasters/statistics/all`  | Get all coasters statistics |

### Wagons

| Method   | Endpoint                                   | Description                |
| -------- | ------------------------------------------ | -------------------------- |
| `POST`   | `/api/coasters/:coasterId/wagons`          | Create wagon for coaster   |
| `GET`    | `/api/coasters/:coasterId/wagons`          | Get all wagons for coaster |
| `GET`    | `/api/coasters/:coasterId/wagons/:wagonId` | Get specific wagon         |
| `PUT`    | `/api/coasters/:coasterId/wagons/:wagonId` | Update wagon               |
| `DELETE` | `/api/coasters/:coasterId/wagons/:wagonId` | Delete wagon               |

### Example Requests

#### Create a Coaster

```bash
curl -X POST http://localhost:3050/api/coasters \
  -H "Content-Type: application/json" \
  -d '{
    "staffCount": 5,
    "dailyClientCount": 1000,
    "trackLength": 500.5,
    "timeFrom": "09:00",
    "timeTo": "18:00"
  }'
```

#### Create a Wagon

```bash
curl -X POST http://localhost:3050/api/coasters/{coasterId}/wagons \
  -H "Content-Type: application/json" \
  -d '{
    "seatCount": 24,
    "wagonSpeed": 45.5
  }'
```

## 📊 Data Models

### Coaster

```typescript
{
  id: string; // UUID
  staffCount: number; // Number of staff members
  dailyClientCount: number; // Expected daily visitors
  trackLength: number; // Track length in meters
  timeFrom: string; // Opening time (HH:MM)
  timeTo: string; // Closing time (HH:MM)
  createdAt: Date;
  updatedAt: Date;
  nodeId: string; // Node that created/modified
}
```

### Wagon

```typescript
{
  id: string; // UUID
  coasterId: string; // Parent coaster ID
  seatCount: number; // Number of seats
  wagonSpeed: number; // Maximum speed in km/h
  createdAt: Date;
  updatedAt: Date;
  nodeId: string; // Node that created/modified
}
```

### Statistics

```typescript
{
  coasterId: string;
  name: string;
  operatingHours: {
    from: string;
    to: string;
    totalMinutes: number;
    remainingMinutes: number;
  }
  wagons: {
    totalCount: number;
    totalSeats: number;
    averageSpeed: number;
    status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  }
  staff: {
    assigned: number;
    recommended: number;
    status: 'ADEQUATE' | 'UNDERSTAFFED' | 'OVERSTAFFED';
  }
  capacity: {
    hourlyCapacity: number;
    dailyCapacity: number;
    utilizationRate: number;
    status: 'HIGH' | 'MEDIUM' | 'LOW';
  }
  problems: Array<{
    type: 'CAPACITY' | 'STAFF' | 'OPERATIONAL';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
  }>;
  overallStatus: 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE';
  lastUpdated: Date;
}
```

## 🔧 Configuration

### Environment Variables

| Variable     | Description            | Default     | Required |
| ------------ | ---------------------- | ----------- | -------- |
| `NODE_ENV`   | Environment (dev/prod) | `dev`       | ✅       |
| `PORT`       | Application port       | `3000`      | ✅       |
| `NODE_ID`    | Unique node identifier | -           | ✅       |
| `REDIS_HOST` | Redis host             | `localhost` | ✅       |
| `REDIS_PORT` | Redis port             | `6379`      | ✅       |
| `DATA_PATH`  | Data storage path      | `./data`    | ✅       |

### Docker Compose Configuration

The system runs multiple nodes by default:

- **Development Node**: For testing and development
- **Production Nodes**: For production workloads with load balancing

Each node has its own data directory but shares the same Redis instance for coordination.

## 🔄 Distributed System Features

### Leader Election

- Automatic leader selection using Redis distributed locks
- Leader renewal every 20 seconds
- Automatic failover when leader becomes unavailable

### Data Synchronization

- Real-time event publishing for all CRUD operations
- Event processing every 5 seconds
- Conflict resolution based on timestamps and node priority

### Health Monitoring

- Node heartbeat every 30 seconds
- Dead node cleanup after 5 minutes of inactivity
- Cluster health status reporting

### Fault Tolerance

- Automatic node recovery
- Data persistence across restarts
- Redis connection retry logic

## 📈 Monitoring and Statistics

### Capacity Calculations

- **Hourly Capacity**: Based on wagon count, seats, and operational efficiency
- **Daily Capacity**: Projected based on operating hours
- **Utilization Rate**: Current usage vs. maximum capacity

### Problem Detection

- **Capacity Issues**: Insufficient wagons or seats
- **Staff Problems**: Under/overstaffing detection
- **Operational Issues**: Speed, maintenance, and safety concerns

### Health Checks

- Node status monitoring
- Redis connectivity checks
- Cluster health assessment

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:cov

# Debug tests
npm run test:debug
```

## 📝 Logging

The system uses Winston for structured logging:

- **Console Output**: Development environment
- **File Rotation**: Production environment with daily rotation
- **Log Levels**: Error, Warn, Info, Debug
- **Structured Format**: JSON format with timestamps and context

Log files are stored in the `/logs` directory with automatic rotation.

## 🐳 Docker Support

### Dockerfile Features

- Multi-stage build for optimization
- Non-root user for security
- Health checks included
- Debug support for development

### Docker Compose Services

- **Redis**: Persistent data storage with volume mounting
- **Multiple App Nodes**: Load balancing and high availability
- **Shared Volumes**: Logs and data persistence
- **Network Isolation**: Custom bridge network

## 🔒 Security Considerations

- Input validation using Zod schemas
- Error handling with custom filters
- Non-root Docker containers
- Environment variable validation
- Request size limits (2MB)

## 🚀 Production Deployment

### Scaling

- Add more nodes by duplicating services in docker-compose.yml
- Each node needs a unique `NODE_ID`
- Redis handles coordination automatically

### Monitoring

- Health check endpoints available
- Cluster status via API
- Comprehensive logging

### Backup

- Data files are automatically backed up
- Redis persistence enabled
- Volume mounting for data safety

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the UNLICENSED license.

## 🆘 Troubleshooting

### Common Issues

**Redis Connection Failed**

```bash
# Check Redis status
docker-compose ps redis
docker-compose logs redis
```

**Node Not Joining Cluster**

```bash
# Check node logs
docker-compose logs app-dev
# Verify environment variables
docker-compose exec app-dev env | grep NODE_ID
```

**Data Synchronization Issues**

```bash
# Check sync events in Redis
docker-compose exec redis redis-cli
> LLEN sync_events
> LRANGE sync_events 0 -1
```

### Debug Mode

```bash
# Run with debug logging
NODE_ENV=dev npm run start:debug

# Docker debug mode
docker-compose exec app-dev npm run debug-docker
```

## 📞 Support

For issues and questions:

1. Check the troubleshooting section
2. Review the logs for error messages
3. Verify environment configuration
4. Check Redis connectivity
5. Ensure all required environment variables are set

---

Built with ❤️ using NestJS, Redis, and Docker
