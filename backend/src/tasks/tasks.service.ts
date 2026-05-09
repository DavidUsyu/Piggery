import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type DueTask = {
  pigId: string;
  tagNumber: string;
  task:
    | 'WEANING'
    | 'WEIGHT_CHECK'
    | 'DEWORMING'
    | 'VACCINATION'
    | 'TEETH_CLIPPING'
    | 'TAIL_DOCKING'
    | 'CASTRATION'
    | 'IRON_INJECTION'
    | 'PREGNANCY_CHECK'
    | 'FARROWING_EXPECTED'
    | 'REBREED';
  status: 'UPCOMING' | 'DUE' | 'OVERDUE';
  dueDate: string; // ISO
  daysLeft: number;
  reason: string;
};

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private daysUntil(due: Date) {
    const now = new Date();
    return Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  private statusFromDaysLeft(daysLeft: number): DueTask['status'] {
    if (daysLeft < 0) return 'OVERDUE';
    if (daysLeft === 0) return 'DUE';
    return 'UPCOMING';
  }

  async dueForFarm(farmId: string): Promise<DueTask[]> {
    const pigs = await this.prisma.pig.findMany({
      where: { farmId, status: 'ACTIVE' },
      include: { events: { orderBy: { eventDate: 'desc' } } },
    });

    const tasks: DueTask[] = [];

    const pushTask = (
      t: Omit<DueTask, 'daysLeft' | 'status' | 'dueDate'> & {
        due: Date;
        status?: DueTask['status'];
      },
    ) => {
      const daysLeft = this.daysUntil(t.due);
      tasks.push({
        pigId: t.pigId,
        tagNumber: t.tagNumber,
        task: t.task,
        dueDate: t.due.toISOString(),
        daysLeft,
        status: t.status ?? this.statusFromDaysLeft(daysLeft),
        reason: t.reason,
      });
    };

    for (const pig of pigs) {
      const lastEvent = (type: string) => pig.events.find((e) => e.type === type);

      // ----------------------------------------------------
      // AGE / BIRTHDATE-BASED TASKS
      // These should only run if birthDate exists.
      // ----------------------------------------------------
      if (pig.birthDate) {
        // 1) WEANING due at day 56
        if (!lastEvent('WEANING')) {
          const due = new Date(pig.birthDate);
          due.setDate(due.getDate() + 56);

          pushTask({
            pigId: pig.id,
            tagNumber: pig.tagNumber,
            task: 'WEANING',
            due,
            reason: 'No WEANING event recorded yet (recommended at ~8 weeks).',
          });
        }

        // 2) WEIGHT_CHECK every 14 days
        const lastWeight = lastEvent('WEIGHT');
        if (!lastWeight) {
          pushTask({
            pigId: pig.id,
            tagNumber: pig.tagNumber,
            task: 'WEIGHT_CHECK',
            due: new Date(),
            status: 'DUE',
            reason: 'No WEIGHT recorded yet.',
          });
        } else {
          const due = new Date(lastWeight.eventDate);
          due.setDate(due.getDate() + 14);

          const daysLeft = this.daysUntil(due);
          if (daysLeft <= 0) {
            pushTask({
              pigId: pig.id,
              tagNumber: pig.tagNumber,
              task: 'WEIGHT_CHECK',
              due,
              reason: `Last WEIGHT was on ${lastWeight.eventDate
                .toISOString()
                .slice(0, 10)}.`,
            });
          }
        }

        const oneTimeCareEvents = [
          {
            day: 3,
            task: 'TEETH_CLIPPING' as const,
            label: 'Teeth clipping due at day 3.',
          },
          {
            day: 3,
            task: 'TAIL_DOCKING' as const,
            label: 'Tail docking due at day 3.',
          },
          {
            day: 21,
            task: 'CASTRATION' as const,
            label: 'Castration due at day 21.',
            sex: 'MALE',
          },
          {
            day: 21,
            task: 'IRON_INJECTION' as const,
            label: 'Iron injection due at day 21. Recommended dose: 2ml.',
          },
        ];

        for (const careEvent of oneTimeCareEvents) {
          if ('sex' in careEvent && careEvent.sex !== pig.sex) {
            continue;
          }

          const due = new Date(pig.birthDate);
          due.setDate(due.getDate() + careEvent.day);

          const alreadyDone = pig.events.some(
            (e) =>
              e.type === careEvent.task &&
              Math.abs(new Date(e.eventDate).getTime() - due.getTime()) <=
                7 * 24 * 60 * 60 * 1000,
          );

          const daysLeft = this.daysUntil(due);

          if (!alreadyDone && daysLeft <= 7) {
            pushTask({
              pigId: pig.id,
              tagNumber: pig.tagNumber,
              task: careEvent.task,
              due,
              reason: careEvent.label,
            });
          }
        }

        // 3) DEWORMING schedule: sequential at 56, 91, 126 days
        const dewormingStages = [
          { day: 56, label: '1st deworming due at day 56 (8 weeks of age).' },
          { day: 91, label: '2nd deworming due at day 91 (13 weeks of age).' },
          { day: 126, label: '3rd deworming due at day 126 (18 weeks of age).' },
        ];

        let completedDewormingEvents = 0;

        for (const stage of dewormingStages) {
          const due = new Date(pig.birthDate);
          due.setDate(due.getDate() + stage.day);

          const alreadyDone = pig.events.some(
            (e) =>
              e.type === 'DEWORMING' &&
              Math.abs(
                new Date(e.eventDate).getTime() - due.getTime(),
              ) <=
                7 * 24 * 60 * 60 * 1000,
          );

          if (alreadyDone) {
            completedDewormingEvents += 1;
            continue;
          }

          const daysLeft = this.daysUntil(due);

          const shouldShow =
            (completedDewormingEvents === 0 && stage.day === 56) ||
            (completedDewormingEvents === 1 && stage.day === 91) ||
            (completedDewormingEvents === 2 && stage.day === 126);

          if (shouldShow && daysLeft <= 7) {
            pushTask({
              pigId: pig.id,
              tagNumber: pig.tagNumber,
              task: 'DEWORMING',
              due,
              reason: stage.label,
            });
          }

          break;
        }
      }

      // ----------------------------------------------------
      // BREEDING FLOW (female pigs only)
      // This should run even if birthDate is missing.
      // ----------------------------------------------------
      if (pig.sex === 'FEMALE') {
        const lastBreeding = pig.events
          .filter((e) => e.type === 'BREEDING')
          .sort(
            (a, b) =>
              new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
          )[0];

        if (lastBreeding) {
          const breedingDate = new Date(lastBreeding.eventDate);

          const pregnancyCheckAfterBreeding = pig.events
            .filter(
              (e) =>
                e.type === 'PREGNANCY_CHECK' &&
                new Date(e.eventDate).getTime() >= breedingDate.getTime(),
            )
            .sort(
              (a, b) =>
                new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
            )[0];

          const farrowingAfterBreeding = pig.events.some(
            (e) =>
              e.type === 'FARROWING' &&
              new Date(e.eventDate).getTime() >= breedingDate.getTime(),
          );

          // 5a) Pregnancy check due ~21 days after breeding
          if (!pregnancyCheckAfterBreeding) {
            const pregnancyCheckDue = new Date(breedingDate);
            pregnancyCheckDue.setDate(pregnancyCheckDue.getDate() + 21);

            const daysLeftPregnancyCheck = this.daysUntil(pregnancyCheckDue);

            if (daysLeftPregnancyCheck <= 7) {
              pushTask({
                pigId: pig.id,
                tagNumber: pig.tagNumber,
                task: 'PREGNANCY_CHECK',
                due: pregnancyCheckDue,
                reason:
                  'Check whether the sow has returned to heat about 21 days after breeding.',
              });
            }
          }

          const returnedToHeat =
            pregnancyCheckAfterBreeding?.pregnancyCheckResult ===
            'RETURNED_TO_HEAT';

          const confirmedPregnant =
            pregnancyCheckAfterBreeding?.pregnancyCheckResult === 'PREGNANT';

          // 5b) If she returned to heat, action should be NOW / very soon,
          // not 21 days later.
          if (returnedToHeat && pregnancyCheckAfterBreeding) {
            const rebreedDue = new Date(pregnancyCheckAfterBreeding.eventDate);

            pushTask({
              pigId: pig.id,
              tagNumber: pig.tagNumber,
              task: 'REBREED',
              due: rebreedDue,
              status:
                this.daysUntil(rebreedDue) <= 0 ? 'DUE' : undefined,
              reason:
                'Pig returned to heat after pregnancy check. Check heat signs and breed again now.',
            });
          }

          // 5c) If pregnant and no farrowing yet, show expected farrowing
          if (confirmedPregnant && !farrowingAfterBreeding && !returnedToHeat) {
            const farrowingDue = new Date(breedingDate);
            farrowingDue.setDate(farrowingDue.getDate() + 114);

            const daysLeftFarrowing = this.daysUntil(farrowingDue);

            if (daysLeftFarrowing <= 14) {
              pushTask({
                pigId: pig.id,
                tagNumber: pig.tagNumber,
                task: 'FARROWING_EXPECTED',
                due: farrowingDue,
                reason:
                  'Expected farrowing date (about 114 days after breeding). Prepare for delivery.',
              });
            }
          }
        }
      }
    }

    const rank = { OVERDUE: 0, DUE: 1, UPCOMING: 2 } as const;
    tasks.sort((a, b) => {
      if (rank[a.status] !== rank[b.status]) {
        return rank[a.status] - rank[b.status];
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return tasks;
  }
}
