import { IActivity } from "../db/models/activity";
import { Time } from "../Time";

export function getActivityDurationMinutes(activity: IActivity) {
  if (!activity.endTime) {
    return 0;
  }

  let timeDiffSeconds;

  // An end time at or after the start stays on the same day; an earlier one
  // means the activity ran past midnight, so it wraps to the next day.
  if (activity.startTime <= activity.endTime) {
    timeDiffSeconds = new Time(activity.endTime).valueOf() - new Time(activity.startTime).valueOf();
  } else {
    timeDiffSeconds = 24 * 60 * 60 - new Time(activity.startTime).valueOf() + new Time(activity.endTime).valueOf();
  }

  return Math.floor(timeDiffSeconds / 60);
}