/**
 * Layout del Bot v2 — SIN barra lateral propia.
 * La navegacion del bot ahora vive en el menu principal (grupo "El Coyote").
 * Este layout solo conserva el banner de kill switch.
 */
import { getKillSwitchStatus } from "@/lib/bot/config/feature-flags";
import KillSwitchBanner from "./_components/KillSwitchBanner";

export default async function BotAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const killSwitch = await getKillSwitchStatus().catch(() => ({ killed: false, v2Active: true }));
  return (
    <>
      {killSwitch.killed && <KillSwitchBanner />}
      {children}
    </>
  );
}
