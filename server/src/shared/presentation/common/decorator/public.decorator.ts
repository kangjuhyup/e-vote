import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE_METADATA_KEY = 'publicRoute';

export const Public = (): ClassDecorator & MethodDecorator =>
  SetMetadata(PUBLIC_ROUTE_METADATA_KEY, true);
