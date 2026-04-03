/**
 * MCP Bus Tests
 */

import { MCPBus, MessageBuilder } from '../mcp-bus';
import { MCPMessage } from '../types';

describe('MCPBus', () => {
  let bus: MCPBus;

  beforeEach(() => {
    bus = new MCPBus({ enableLogging: false });
  });

  describe('Constructor', () => {
    it('should create bus with default config', () => {
      const stats = bus.getStats();
      expect(stats.totalMessagesSent).toBe(0);
      expect(stats.activeSubscriptions).toBe(0);
    });

    it('should create bus with custom config', () => {
      const customBus = new MCPBus({
        defaultTTL: 60000,
        maxQueueSize: 2000,
        enableIdempotency: false,
      });
      expect(customBus).toBeDefined();
    });
  });

  describe('MessageBuilder', () => {
    it('should build valid message', () => {
      const message = new MessageBuilder()
        .from('agent-1')
        .to('agent-2')
        .type('command')
        .payload({ action: 'test' })
        .ttl(30000)
        .idempotentKey('test-key-1')
        .build();

      expect(message.protocol).toBe('mcp/1.0');
      expect(message.from).toBe('agent-1');
      expect(message.to).toBe('agent-2');
      expect(message.type).toBe('command');
      expect(message.payload.action).toBe('test');
      expect(message.idempotentKey).toBe('test-key-1');
    });

    it('should throw error for missing required fields', () => {
      expect(() => {
        new MessageBuilder()
          .from('agent-1')
          .build();
      }).toThrow('Missing required fields');
    });
  });

  describe('Subscribe', () => {
    it('should subscribe agent successfully', () => {
      const callback = jest.fn();
      const subscription = bus.subscribe('agent-1', callback);

      expect(subscription.id).toBeDefined();
      expect(subscription.agentId).toBe('agent-1');
      expect(subscription.isActive).toBe(true);

      const stats = bus.getStats();
      expect(stats.activeSubscriptions).toBe(1);
    });

    it('should unsubscribe successfully', () => {
      const callback = jest.fn();
      const subscription = bus.subscribe('agent-1', callback);
      subscription.unsubscribe();

      expect(subscription.isActive).toBe(false);

      const stats = bus.getStats();
      expect(stats.activeSubscriptions).toBe(0);
    });
  });

  describe('Send', () => {
    it('should send message to subscriber', async () => {
      const receivedMessages: MCPMessage[] = [];
      const callback = (msg: MCPMessage) => receivedMessages.push(msg);
      
      bus.subscribe('agent-1', callback);

      const message = new MessageBuilder()
        .from('sender')
        .to('agent-1')
        .type('command')
        .payload({ test: true })
        .requiresAck(true)
        .build();

      const response = await bus.send(message);

      expect(response.status).toBe('success');
      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].payload.test).toBe(true);
    });

    it('should return error for non-existent recipient', async () => {
      const message = new MessageBuilder()
        .from('sender')
        .to('unknown-agent')
        .type('command')
        .payload({ test: true })
        .build();

      const response = await bus.send(message);

      expect(response.status).toBe('error');
      expect(response.error).toContain('RECIPIENT_NOT_FOUND');
    });

    it('should respect idempotency', async () => {
      const callback = jest.fn();
      bus.subscribe('agent-1', callback);

      const message = new MessageBuilder()
        .from('sender')
        .to('agent-1')
        .type('command')
        .payload({ test: true })
        .idempotentKey('same-key')
        .requiresAck(true)
        .build();

      const response1 = await bus.send(message);
      const response2 = await bus.send(message);

      expect(response1.status).toBe('success');
      expect(response2.status).toBe('success');
      expect(callback).toHaveBeenCalledTimes(1); // Should only be called once
    });
  });

  describe('Broadcast', () => {
    it('should broadcast to all subscribers', async () => {
      const receivedMessages: MCPMessage[] = [];
      const callback = (msg: MCPMessage) => receivedMessages.push(msg);

      bus.subscribe('agent-1', callback);
      bus.subscribe('agent-2', callback);
      bus.subscribe('agent-3', callback);

      const message = new MessageBuilder()
        .from('sender')
        .to('*')
        .type('proposal')
        .payload({ broadcast: true })
        .build();

      const responses = await bus.broadcast(message);

      expect(responses.length).toBe(3);
      expect(receivedMessages.length).toBe(3);
    });
  });

  describe('TTL', () => {
    it('should reject expired messages', async () => {
      const callback = jest.fn();
      bus.subscribe('agent-1', callback);

      const message = new MessageBuilder()
        .from('sender')
        .to('agent-1')
        .type('command')
        .payload({ test: true })
        .ttl(1) // 1ms TTL
        .build();

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await bus.send(message);

      expect(response.status).toBe('error');
      expect(response.error).toContain('TTL_EXPIRED');
    });
  });

  describe('Statistics', () => {
    it('should track message statistics', async () => {
      const callback = jest.fn();
      bus.subscribe('agent-1', callback);

      for (let i = 0; i < 5; i++) {
        const message = new MessageBuilder()
          .from('sender')
          .to('agent-1')
          .type('command')
          .payload({ index: i })
          .build();
        await bus.send(message);
      }

      const stats = bus.getStats();
      expect(stats.totalMessagesSent).toBe(5);
      expect(stats.totalMessagesReceived).toBe(5);
    });
  });
});
