import { query } from "./_generated/server";
import { requireIdentity } from "./lib/auth";

export const getAdmin954Overview = query({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx);

    const [users, totals] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("attendanceTotals").collect(),
    ]);

    const attendanceByUser = new Map<string, { totalAttended: number; totalConducted: number }>();
    for (const row of totals) {
      const current = attendanceByUser.get(row.userId) || { totalAttended: 0, totalConducted: 0 };
      current.totalAttended += row.classesAttended;
      current.totalConducted += row.classesConducted;
      attendanceByUser.set(row.userId, current);
    }

    const formattedUsers = users
      .map((user) => {
        const attendance = attendanceByUser.get(user.clerkUserId) || {
          totalAttended: 0,
          totalConducted: 0,
        };
        const avgAttendance = attendance.totalConducted
          ? (attendance.totalAttended / attendance.totalConducted) * 100
          : 0;

        return {
          id: user.clerkUserId,
          username: user.username,
          name: user.name || "-",
          createdAt: user.createdAt,
          avgAttendance: Number(avgAttendance.toFixed(1)),
          totalAttended: attendance.totalAttended,
          totalConducted: attendance.totalConducted,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return {
      users: formattedUsers,
    };
  },
});
