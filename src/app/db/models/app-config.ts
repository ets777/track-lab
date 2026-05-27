import { WithOptionalKeys } from 'src/app/types/with-optional-keys';

export interface IAppConfigDb {
  id: number;
  key: string;
  value: string;
}

export type IAppConfigCreateDto = WithOptionalKeys<IAppConfigDb, 'id'>;
