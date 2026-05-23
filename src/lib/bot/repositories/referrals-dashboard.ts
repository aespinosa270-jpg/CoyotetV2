/**
 * Queries para el dashboard /crm/admin/bot/referidos
 */
import { prisma } from "@/lib/prisma";

export interface ReferralsDashboard {
  stats: {
    totalReferrals: number;
    pending: number;
    converted: number;
    totalCreditOtorgado: number; // suma de creditEarned en converted
    totalCreditDisponible: number; // suma de User.referralCredit
  };
  topReferrers: Array<{
    userId: string;
    name: string | null;
    phone: string | null;
    referralCode: string | null;
    totalReferred: number; // count total
    totalConverted: number; // count converted
    totalEarned: number; // suma creditEarned
    currentBalance: number; // referralCredit actual
  }>;
  recentReferrals: Array<{
    id: string;
    codeUsed: string;
    status: string;
    refereeName: string | null;
    refereePhone: string | null;
    referrerName: string | null;
    orderTotal: number | null;
    creditEarned: number;
    createdAt: Date;
    convertedAt: Date | null;
  }>;
}

export async function getReferralsDashboard(): Promise<ReferralsDashboard> {
  const [totalReferrals, pending, converted, recentReferrals, topReferrersRaw] =
    await Promise.all([
      prisma.referral.count(),
      prisma.referral.count({ where: { status: "pending" } }),
      prisma.referral.count({ where: { status: "converted" } }),
      prisma.referral.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          referrer: { select: { name: true } },
        },
      }),
      prisma.referral.groupBy({
        by: ["referrerId"],
        _count: { _all: true },
        _sum: { creditEarned: true },
        orderBy: { _count: { referrerId: "desc" } },
        take: 10,
      }),
    ]);

  // Totales en MXN
  const convertedTotalsRaw = await prisma.referral.aggregate({
    where: { status: "converted" },
    _sum: { creditEarned: true },
  });
  const totalCreditOtorgado = convertedTotalsRaw._sum.creditEarned ?? 0;

  const userCreditsRaw = await prisma.user.aggregate({
    _sum: { referralCredit: true },
  });
  const totalCreditDisponible = userCreditsRaw._sum.referralCredit ?? 0;

  // Hidratar topReferrers con info de User
  const topReferrers = await Promise.all(
    topReferrersRaw.map(async (r) => {
      const user = await prisma.user.findUnique({
        where: { id: r.referrerId },
        select: { name: true, phone: true, referralCode: true, referralCredit: true },
      });

      const convertedCount = await prisma.referral.count({
        where: { referrerId: r.referrerId, status: "converted" },
      });

      return {
        userId: r.referrerId,
        name: user?.name ?? null,
        phone: user?.phone ?? null,
        referralCode: user?.referralCode ?? null,
        totalReferred: r._count._all,
        totalConverted: convertedCount,
        totalEarned: r._sum.creditEarned ?? 0,
        currentBalance: user?.referralCredit ?? 0,
      };
    })
  );

  return {
    stats: {
      totalReferrals,
      pending,
      converted,
      totalCreditOtorgado,
      totalCreditDisponible,
    },
    topReferrers,
    recentReferrals: recentReferrals.map((r) => ({
      id: r.id,
      codeUsed: r.codeUsed,
      status: r.status,
      refereeName: r.refereeName,
      refereePhone: r.refereePhone,
      referrerName: r.referrer.name,
      orderTotal: r.orderTotal,
      creditEarned: r.creditEarned,
      createdAt: r.createdAt,
      convertedAt: r.convertedAt,
    })),
  };
}