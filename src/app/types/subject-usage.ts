/** What a still-referenced entity is used by. */
export type SubjectUsage = 'rule' | 'experiment' | 'widget';

/** A live reference that blocks a delete, and the entity it points at. */
export interface BlockingUsage {
  usage: SubjectUsage;
  /** Name of the referenced entity — may be a `TK_` key for base entities. */
  name: string;
}
