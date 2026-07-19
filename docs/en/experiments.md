---
title: Experiments
summary: Test whether a change did anything, with indicators and rules.
order: 7
---

An experiment answers one question: did this change anything? You name a period, say what you want to watch, and optionally promise what you will do during it. TrackLab then compares what happened against the week before the experiment started.

## Indicators — what is measured

An indicator is any entity you already track: a metric (Mood), an action (Running), a tag, or a list item. Each indicator carries a direction:

| Direction | Meaning |
| --- | --- |
| Up | You expect this to grow |
| Down | You expect this to shrink |
| Any | You only watch it, it cannot fail |

For metrics, the value is the average of the values you logged. For actions, tags and items, it is the total time spent. An experiment can hold up to three indicators.

## Rules — what you promise

A rule is a commitment for the duration, for example "Running at least 3 times a week". Rules are checked per day, week or month and appear on your dashboard as a checklist. Rules are optional — add them when the experiment is about changing a habit rather than just observing one. An experiment can hold up to three rules.

## The baseline

The starting value of each indicator is taken from the seven days before the start date. The form shows it as soon as you pick an indicator and a period. If there is no data in that week, TrackLab says so and uses the experiment's first week as the baseline instead.

## Creating one

Open Lab → Experiments → +. Fill in:

1. Title — what you are testing, for example "Morning runs".
2. Period — start and end date. Defaults to one month.
3. Indicators — press "Add" and pick from the list.
4. Rules — press "Add" and pick from the list.

If a picker is empty, or what you need is not in it, use the New metric / New action / New tag / New item / New rule buttons pinned at the bottom of the picker. They open the same form the dedicated pages use, save it, and select the result for you — you never leave the experiment. This nests: creating a rule here lets you create its subject action the same way.

## How it finishes

An experiment runs until its end date, then TrackLab marks it Success or Failed. It can also fail early:

| Outcome | When |
| --- | --- |
| Success | The end date passed and every up/down indicator moved as expected |
| Failed — trend not met | The end date passed and an indicator moved the wrong way |
| Failed — low uptime | After the first week, fewer than 50% of your rule checks were met |
| Failed — initial values not logged | After the first week, a trending metric still has no value to compare against |
| Failed — final values not logged | The experiment ended with no data to compare against |

Indicators set to "any" never cause a failure. Uptime only applies when the experiment has rules — an observation-only experiment cannot fail on uptime.

## While it runs

Keep logging activities as usual. That is the only input an experiment needs; it reads the same records the rest of the app does. The dashboard shows the rule checklist for the current period, so the daily loop stays the same as any other day.
