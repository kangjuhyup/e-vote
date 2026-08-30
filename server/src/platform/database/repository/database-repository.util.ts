import { randomUUID } from 'node:crypto';
import {
  LoadStrategy,
  type AnyEntity,
  type EntityClass,
} from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { DatabaseEntityClasses } from '../entity/entity-factory-context';
import type { DatabaseEntityRegistryFactory } from '../database.config';

export type DatabaseEntity = Record<string, unknown>;
export type DatabaseEntityClass = EntityClass<AnyEntity>;
export type LoadedCollectionLike<T> =
  readonly T[] | { getItems(check?: boolean): T[] };

export const JOINED_RELATION_LOAD_OPTIONS = {
  strategy: LoadStrategy.JOINED,
} as const;

let databaseEntityRegistryFactory: DatabaseEntityRegistryFactory | undefined;

export function configureDatabaseEntityRegistryFactory(
  factory: DatabaseEntityRegistryFactory,
): void {
  databaseEntityRegistryFactory = factory;
}

export function nextRepositoryId(): string {
  return randomUUID();
}

export function entityReference(
  em: EntityManager,
  entityClass: DatabaseEntityClass,
  id: string,
): DatabaseEntity {
  const reference = em.getReference(entityClass as any, id as any) as unknown;

  return reference as DatabaseEntity;
}

export function loadedItems<T>(value: LoadedCollectionLike<T>): T[] {
  return 'getItems' in value ? value.getItems() : [...value];
}

export async function getDatabaseEntities(): Promise<DatabaseEntityClasses> {
  if (!databaseEntityRegistryFactory) {
    throw new Error('database entity registry factory is not configured');
  }

  const registry = await databaseEntityRegistryFactory();
  return registry as unknown as DatabaseEntityClasses;
}

export async function prepareEntityForSave(
  em: EntityManager,
  entityClass: DatabaseEntityClass,
  id: string,
  createData: Record<string, unknown>,
  updateData: Record<string, unknown>,
): Promise<DatabaseEntity> {
  const existing = await em.findOne(entityClass as any, { id });

  if (existing) {
    em.assign(existing, updateData as any);
    return existing;
  }

  const entity = em.create(
    entityClass as any,
    {
      id,
      ...createData,
      ...updateData,
    } as any,
  ) as unknown as DatabaseEntity;
  em.persist(entity as any);

  return entity;
}

export async function saveEntity(
  em: EntityManager,
  entityClass: DatabaseEntityClass,
  id: string,
  createData: Record<string, unknown>,
  updateData: Record<string, unknown>,
): Promise<void> {
  await prepareEntityForSave(em, entityClass, id, createData, updateData);
  await em.flush();
}
