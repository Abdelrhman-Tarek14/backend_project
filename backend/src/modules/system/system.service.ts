import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import * as os from 'os';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class SystemService implements OnModuleInit {
  private readonly logger = new Logger(SystemService.name);
  private realtimeGateway: RealtimeGateway;

  constructor(
    private prisma: PrismaService,
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    this.realtimeGateway = this.moduleRef.get(RealtimeGateway, { strict: false });
  }

  async getMaintenanceStatus() {
    const status = await this.prisma.integrationStatus.findUnique({
      where: { system: 'maintenance' },
    });
    return {
      enabled: status?.status === 'ENABLED',
      updatedAt: status?.updatedAt || new Date(),
    };
  }

  async toggleMaintenance(enabled: boolean) {
    const statusValue = enabled ? 'ENABLED' : 'DISABLED';
    const integrationStatus = await this.prisma.integrationStatus.upsert({
      where: { system: 'maintenance' },
      create: { system: 'maintenance', status: statusValue },
      update: { status: statusValue },
    });

    this.logger.log(`Maintenance Mode toggled to: ${statusValue}`);

    // Broadcast to all connected clients (management and normal users)
    this.realtimeGateway.server.emit('maintenance_status_updated', {
      enabled,
      timestamp: integrationStatus.updatedAt,
    });

    return { enabled, updatedAt: integrationStatus.updatedAt };
  }

  async getSystemHealth() {
    // 1. Database Check (Prisma)
    let isDatabaseOperational = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      isDatabaseOperational = true;
    } catch (e) {
      this.logger.error('Database health check failed', e);
    }

    // 2. WebSockets Check & Live Traffic
    let isWebsocketOperational = false;
    let activeUsers = 0;
    try {
      if (this.realtimeGateway && this.realtimeGateway.server) {
        isWebsocketOperational = true;
        // The engine object holds connected clients count in Socket.io
        activeUsers = this.realtimeGateway.server.engine?.clientsCount || 0;
      }
    } catch (e) {
      this.logger.error('Websocket health check failed', e);
    }

    // 3. Salesforce Heartbeat Check
    let isSalesforceOperational = false;
    let lastSalesforceSync: Date | null = null;
    try {
      const sfRecord = await this.prisma.integrationStatus.findUnique({
        where: { system: 'salesforce' },
      });

      if (sfRecord) {
        lastSalesforceSync = sfRecord.updatedAt;
        const now = Date.now();
        const lastUpdate = sfRecord.updatedAt.getTime();
        const differenceInMinutes = (now - lastUpdate) / (1000 * 60);

        // 6 minutes threshold (5m ping + 1m buffer)
        if (differenceInMinutes <= 6) {
          isSalesforceOperational = true;
        } else {
          this.logger.warn(`Salesforce microservice heartbeat missed. Last update: ${sfRecord.updatedAt}`);
        }
      }
    } catch (e) {
      this.logger.error('Salesforce health check failed', e);
    }

    return {
      uptime: process.uptime(),
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cpuLoad: os.loadavg()[0],
      activeUsers,
      timestamp: new Date(),
      services: {
        database: {
          status: isDatabaseOperational ? 'operational' : 'down',
        },
        websockets: {
          status: isWebsocketOperational ? 'operational' : 'down',
        },
        salesforce: {
          status: isSalesforceOperational ? 'operational' : 'down',
          lastSync: lastSalesforceSync,
        },
      },
    };
  }

  async getSalesforceConfig() {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'SALESFORCE_CREDENTIALS' },
    });

    if (!config) {
      return {
        data: {
          auraToken: '',
          cookie: '',
          auraContext: '',
          sfdcPageScopeId: '',
        },
        updatedAt: null,
      };
    }

    return {
      data: config.value,
      updatedAt: config.updatedAt,
    };
  }

  async updateSalesforceConfig(payload: any) {
    const config = await this.prisma.systemConfig.upsert({
      where: { key: 'SALESFORCE_CREDENTIALS' },
      create: {
        key: 'SALESFORCE_CREDENTIALS',
        value: payload,
      },
      update: {
        value: payload,
      },
    });

    this.logger.log('Salesforce credentials updated in database');
    return config.value;
  }
}
