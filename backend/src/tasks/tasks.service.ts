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
      if (!pig.birthDate) continue;

      const lastEvent = (type: string) => pig.events.find((e) => e.type === type);

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

      // 3) VACCINATION schedule: sequential at 56, 91, 126 days
      const vaccinationStages = [
        { day: 56, label: 'Vaccination 1 (56 days)' },
        { day: 91, label: 'Vaccination 2 (91 days)' },
        { day: 126, label: 'Vaccination 3 (126 days)' },
      ];

      let completedVaccinations = 0;

      for (const stage of vaccinationStages) {
        const due = new Date(pig.birthDate);
        due.setDate(due.getDate() + stage.day);

        const alreadyDone = pig.events.some(
          (e) =>
            e.type === 'VACCINATION' &&
            Math.abs(
              new Date(e.eventDate).getTime() - due.getTime(),
            ) <= 7 * 24 * 60 * 60 * 1000,
        );

        if (alreadyDone) {
          completedVaccinations += 1;
          continue;
        }

        const daysLeft = this.daysUntil(due);

        const shouldShow =
          (completedVaccinations === 0 && stage.day === 56) ||
          (completedVaccinations === 1 && stage.day === 91) ||
          (completedVaccinations === 2 && stage.day === 126);

        if (shouldShow && daysLeft <= 7) {
          pushTask({
            pigId: pig.id,
            tagNumber: pig.tagNumber,
            task: 'VACCINATION',
            due,
            reason: stage.label,
          });
        }

        break;
      }

      // 4) DEWORMING starter rule: due day 60 if never done
      if (!lastEvent('DEWORMING')) {
        const due = new Date(pig.birthDate);
        due.setDate(due.getDate() + 60);

        const ageDays = Math.floor(
          (Date.now() - pig.birthDate.getTime()) / 86400000,
        );

        if (ageDays >= 45) {
          pushTask({
            pigId: pig.id,
            tagNumber: pig.tagNumber,
            task: 'DEWORMING',
            due,
            reason: 'No DEWORMING recorded yet.',
          });
        }
      }

      // 5) BREEDING FLOW (female pigs only)
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
                  'Check whether the sow has returned to heat 21 days after breeding.',
              });
            }
          }

          const returnedToHeat =
            pregnancyCheckAfterBreeding?.pregnancyCheckResult ===
            'RETURNED_TO_HEAT';

          const confirmedPregnant =
            pregnancyCheckAfterBreeding?.pregnancyCheckResult === 'PREGNANT';

          if (returnedToHeat) {
            pushTask({
              pigId: pig.id,
              tagNumber: pig.tagNumber,
              task: 'REBREED',
              due: new Date(),
              status: 'DUE',
              reason:
                'Pig returned to heat after pregnancy check. Record a new breeding event.',
            });
          }

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