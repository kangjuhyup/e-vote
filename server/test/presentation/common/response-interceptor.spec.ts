import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { MaskedPersonalData } from '../../../src/presentation/common/decorator/masked-personal-data.decorator';
import { ResponseInterceptor } from '../../../src/presentation/common/interceptor/response.interceptor';

class ElectorItemResponse {
  @MaskedPersonalData('name')
  readonly name: string;

  @MaskedPersonalData('phoneNumber')
  readonly phoneNumber: string;

  @MaskedPersonalData('birthDate')
  readonly birthDate: string;

  constructor(name: string, phoneNumber: string, birthDate: string) {
    this.name = name;
    this.phoneNumber = phoneNumber;
    this.birthDate = birthDate;
  }
}

describe('ResponseInterceptor personal data masking', () => {
  it('masks decorated response fields before wrapping the response body', async () => {
    const interceptor = new ResponseInterceptor();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          requestId: 'request-1',
        }),
      }),
    } as ExecutionContext;
    const next = {
      handle: () =>
        of(
          new ElectorItemResponse('Kim Min Su', '010-1234-5678', '1990-01-31'),
        ),
    } as CallHandler<ElectorItemResponse>;

    const response = await firstValueFrom(interceptor.intercept(context, next));

    expect(response).toMatchObject({
      success: true,
      data: {
        name: 'K********u',
        phoneNumber: '010-****-5678',
        birthDate: '1990-**-**',
      },
      requestId: 'request-1',
    });
  });
});
