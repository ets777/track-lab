import { WithOptionalKeys } from "src/app/types/with-optional-keys";

export interface IListLinkDb {
  id: number;
  listId: number;
  subjectType: string;
  subjectId: number;
}

export type IListLinkCreateDto = WithOptionalKeys<IListLinkDb, 'id'>;

export interface IListLink extends IListLinkDb { }
