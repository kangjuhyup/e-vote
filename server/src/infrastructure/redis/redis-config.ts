import {
  type ClusterNode,
  type ClusterOptions,
  type RedisOptions,
} from 'ioredis';

export type RedisConnectionConfig =
  | {
      mode: 'standalone';
      options: RedisOptions;
    }
  | {
      mode: 'cluster';
      nodes: ClusterNode[];
      options: ClusterOptions;
    };

type RedisEnvironment = Record<string, string | undefined>;

export function readRedisConnectionConfig(
  env: RedisEnvironment = process.env,
): RedisConnectionConfig {
  const commonOptions = readCommonRedisOptions(env);
  const clusterNodes = env.REDIS_CLUSTER_NODES?.trim();

  if (clusterNodes) {
    return {
      mode: 'cluster',
      nodes: parseClusterNodes(clusterNodes),
      options: {
        lazyConnect: commonOptions.lazyConnect,
        redisOptions: readClusterRedisOptions(commonOptions),
      },
    };
  }

  return {
    mode: 'standalone',
    options: {
      ...readStandaloneAddressOptions(env),
      ...commonOptions,
    },
  };
}

function readCommonRedisOptions(env: RedisEnvironment): RedisOptions {
  const options: RedisOptions = {
    lazyConnect:
      readBoolean(env.REDIS_LAZY_CONNECT, 'REDIS_LAZY_CONNECT') ?? true,
  };

  assignString(options, 'username', env.REDIS_USERNAME);
  assignString(options, 'password', env.REDIS_PASSWORD);
  assignNumber(options, 'db', env.REDIS_DB, 'REDIS_DB');
  assignNumber(
    options,
    'connectTimeout',
    env.REDIS_CONNECT_TIMEOUT_MS,
    'REDIS_CONNECT_TIMEOUT_MS',
  );

  return options;
}

function readStandaloneAddressOptions(env: RedisEnvironment): RedisOptions {
  const redisUrl = env.REDIS_URL?.trim();

  if (redisUrl) {
    return parseRedisUrl(redisUrl);
  }

  const options: RedisOptions = {
    host: env.REDIS_HOST?.trim() || '127.0.0.1',
    port: readNumber(env.REDIS_PORT, 'REDIS_PORT') ?? 6379,
  };

  return options;
}

function readClusterRedisOptions(options: RedisOptions): RedisOptions {
  const clusterRedisOptions: RedisOptions = {};

  assignDefined(clusterRedisOptions, 'username', options.username);
  assignDefined(clusterRedisOptions, 'password', options.password);
  assignDefined(clusterRedisOptions, 'db', options.db);
  assignDefined(clusterRedisOptions, 'connectTimeout', options.connectTimeout);

  return clusterRedisOptions;
}

function parseRedisUrl(value: string): RedisOptions {
  const url = new URL(value);

  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error('REDIS_URL must use redis:// or rediss://');
  }

  const options: RedisOptions = {
    host: url.hostname,
  };

  if (url.port) {
    options.port = readNumber(url.port, 'REDIS_URL port');
  }

  if (url.username) {
    options.username = decodeURIComponent(url.username);
  }

  if (url.password) {
    options.password = decodeURIComponent(url.password);
  }

  const database = url.pathname.replace(/^\//, '');

  if (database) {
    options.db = readNumber(database, 'REDIS_URL database');
  }

  if (url.protocol === 'rediss:') {
    options.tls = {};
  }

  return options;
}

function parseClusterNodes(value: string): ClusterNode[] {
  const nodes = value
    .split(',')
    .map((node) => node.trim())
    .filter(Boolean)
    .map(parseClusterNode);

  if (nodes.length === 0) {
    throw new Error('REDIS_CLUSTER_NODES must contain at least one node');
  }

  return nodes;
}

function parseClusterNode(value: string): ClusterNode {
  if (value.includes('://')) {
    const url = new URL(value);

    if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
      throw new Error(
        'REDIS_CLUSTER_NODES entries must use redis:// or rediss://',
      );
    }

    return {
      host: url.hostname,
      port: readNumber(url.port, 'REDIS_CLUSTER_NODES port') ?? 6379,
    };
  }

  const separatorIndex = value.lastIndexOf(':');
  const host = separatorIndex >= 0 ? value.slice(0, separatorIndex) : value;
  const port =
    separatorIndex >= 0
      ? readNumber(value.slice(separatorIndex + 1), 'REDIS_CLUSTER_NODES port')
      : 6379;

  if (!host.trim()) {
    throw new Error('REDIS_CLUSTER_NODES entries must include a host');
  }

  return {
    host: host.trim(),
    port,
  };
}

function assignString<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: string | undefined,
): void {
  const trimmed = value?.trim();

  if (trimmed) {
    target[key] = trimmed as T[K];
  }
}

function assignNumber<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: string | undefined,
  name: string,
): void {
  const parsed = readNumber(value, name);

  if (parsed !== undefined) {
    target[key] = parsed as T[K];
  }
}

function assignDefined<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function readNumber(
  value: string | undefined,
  name: string,
): number | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return parsed;
}

function readBoolean(
  value: string | undefined,
  name: string,
): boolean | undefined {
  const trimmed = value?.trim().toLowerCase();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed === 'true' || trimmed === '1') {
    return true;
  }

  if (trimmed === 'false' || trimmed === '0') {
    return false;
  }

  throw new Error(`${name} must be true or false`);
}
